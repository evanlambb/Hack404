from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import hashlib
import secrets
import json

# Import the new LLM analyzer
from llm_analyzer import LLMBiasAnalyzer, BiasAnalysisResponse, BiasSpan

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Bias Detection API",
    description="API for detecting bias in text with LLM-powered analysis",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables
load_dotenv()

# Database setup


def get_db_connection():
    """Get database connection"""
    try:
        db_url = os.getenv("SUPABASE_DATABASE_URL")
        if not db_url:
            raise Exception(
                "SUPABASE_DATABASE_URL environment variable not set")

        logger.info(f"Attempting to connect to database...")
        conn = psycopg2.connect(
            db_url,
            cursor_factory=RealDictCursor
        )
        logger.info("Database connection successful")
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        raise e  # Let caller handle the exception

# Authentication models


class UserSignup(BaseModel):
    email: str
    password: str
    name: str


class UserLogin(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None
    token: Optional[str] = None

# Analysis models


class SavedAnalysis(BaseModel):
    id: Optional[int] = None
    user_id: int
    text: str
    result: Dict[str, Any]
    title: Optional[str] = None
    created_at: Optional[str] = None


class SaveAnalysisRequest(BaseModel):
    text: str
    result: Dict[str, Any]
    title: Optional[str] = None


class TextInput(BaseModel):
    text: str
    temperature: Optional[float] = None  # Optional per-request temperature


# Authentication helpers
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()


def generate_token() -> str:
    """Generate a simple token"""
    return secrets.token_urlsafe(32)


def create_user_table():
    """Create users table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                token VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Users table created/verified successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create users table: {e}")
        return False


def create_analyses_table():
    """Create analyses table if it doesn't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                result JSONB NOT NULL,
                title VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        conn.close()
        logger.info("Analyses table created/verified successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to create analyses table: {e}")
        return False


def get_user_from_token(token: str) -> Optional[Dict]:
    """Get user information from token"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, email, name FROM users WHERE token = %s", (token,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return dict(user) if user else None
    except Exception as e:
        logger.error(f"Error getting user from token: {e}")
        return None


# Global analyzer instance
analyzer = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global analyzer
    try:
        logger.info("Creating database tables...")
        user_table_status = create_user_table()
        analyses_table_status = create_analyses_table()
        if user_table_status and analyses_table_status:
            logger.info("Database initialization successful")
        else:
            logger.warning(
                "Database initialization failed - some endpoints may not work")

        logger.info("Initializing LLM bias analyzer...")
        # Get temperature from environment variable, default to 0.3
        default_temperature = float(os.getenv("LLM_TEMPERATURE", "0.3"))
        analyzer = LLMBiasAnalyzer(temperature=default_temperature)
        logger.info(f"Bias analyzer initialized successfully with temperature: {default_temperature}")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise RuntimeError(f"Failed to initialize services: {e}")

# Authentication endpoints


@app.post("/signup", response_model=AuthResponse)
async def signup(user_data: UserSignup):
    """Sign up a new user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s",
                       (user_data.email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return AuthResponse(success=False, message="User already exists")

        # Create new user
        password_hash = hash_password(user_data.password)
        token = generate_token()

        cursor.execute("""
            INSERT INTO users (email, name, password_hash, token)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (user_data.email, user_data.name, password_hash, token))

        user_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()

        return AuthResponse(
            success=True,
            message="User created successfully",
            user_id=user_id,
            token=token
        )

    except Exception as e:
        logger.error(f"Signup error: {e}")
        return AuthResponse(success=False, message="Database connection failed - signup unavailable")


@app.post("/login", response_model=AuthResponse)
async def login(user_data: UserLogin):
    """Login user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check user credentials
        password_hash = hash_password(user_data.password)
        cursor.execute("""
            SELECT id, token FROM users 
            WHERE email = %s AND password_hash = %s
        """, (user_data.email, password_hash))

        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user:
            return AuthResponse(
                success=True,
                message="Login successful",
                user_id=user['id'],
                token=user['token']
            )
        else:
            return AuthResponse(success=False, message="Invalid credentials")

    except Exception as e:
        logger.error(f"Login error: {e}")
        return AuthResponse(success=False, message="Database connection failed - login unavailable")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Bias Detection API is running",
        "status": "healthy",
        "analyzer_loaded": analyzer is not None
    }


@app.post("/analyze", response_model=BiasAnalysisResponse)
async def analyze_text_for_bias(input_data: TextInput):
    """Analyze text for bias using LLM with optional temperature configuration"""
    if not analyzer:
        raise HTTPException(
            status_code=500, detail="Bias analyzer not initialized")

    try:
        text = input_data.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Store original temperature
        original_temperature = analyzer.temperature
        
        # Use per-request temperature if provided
        if input_data.temperature is not None:
            if not (0.0 <= input_data.temperature <= 1.0):
                raise HTTPException(
                    status_code=400, 
                    detail="Temperature must be between 0.0 and 1.0"
                )
            analyzer.set_temperature(input_data.temperature)

        try:
            # Analyze text using LLM
            result = await analyzer.analyze_text(text)
            return result
        finally:
            # Restore original temperature
            analyzer.set_temperature(original_temperature)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during bias analysis: {e}")
        raise HTTPException(
            status_code=500, detail=f"Bias analysis failed: {str(e)}")


@app.post("/analyze-simple")
async def analyze_simple(input_data: TextInput):
    """Simplified endpoint that returns bias spans in a simplified format"""
    try:
        result = await analyze_text_for_bias(input_data)

        return {
            "bias_detected": len(result.bias_spans) > 0,
            "bias_spans": [
                {
                    "text": span.text,
                    "category": span.category,
                    "explanation": span.explanation,
                    "suggested_revision": span.suggested_revision
                }
                for span in result.bias_spans
            ],
            "summary": result.summary
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/save-analysis", response_model=AuthResponse)
async def save_analysis(analysis_data: SaveAnalysisRequest, user: HTTPAuthorizationCredentials = Depends(security)):
    """Save an analysis result to the database"""
    try:
        # Get user from token
        user_data = get_user_from_token(user.credentials)
        if not user_data:
            return AuthResponse(success=False, message="Invalid token")

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO analyses (user_id, text, result, title)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (user_data['id'], analysis_data.text, json.dumps(analysis_data.result), analysis_data.title))

        analysis_id = cursor.fetchone()['id']
        conn.commit()
        cursor.close()
        conn.close()

        return AuthResponse(
            success=True,
            message="Analysis saved successfully",
            user_id=analysis_id
        )

    except Exception as e:
        logger.error(f"Save analysis error: {e}")
        return AuthResponse(success=False, message="Database connection failed - save unavailable")


@app.get("/saved-analyses", response_model=List[SavedAnalysis])
async def get_saved_analyses(user: HTTPAuthorizationCredentials = Depends(security)):
    """Get all saved analyses for the authenticated user"""
    try:
        # Get user from token
        user_data = get_user_from_token(user.credentials)
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid token")

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, user_id, text, result, title, created_at
            FROM analyses
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_data['id'],))

        analyses = cursor.fetchall()
        cursor.close()
        conn.close()

        return [
            SavedAnalysis(
                id=analysis['id'],
                user_id=analysis['user_id'],
                text=analysis['text'],
                result=analysis['result'],
                title=analysis['title'],
                created_at=analysis['created_at'].isoformat(
                ) if analysis['created_at'] else None
            )
            for analysis in analyses
        ]

    except Exception as e:
        logger.error(f"Get saved analyses error: {e}")
        raise HTTPException(
            status_code=500, detail="Database connection failed - retrieval unavailable")


@app.delete("/delete-analysis/{analysis_id}", response_model=AuthResponse)
async def delete_analysis(analysis_id: int, user: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a saved analysis"""
    try:
        # Get user from token
        user_data = get_user_from_token(user.credentials)
        if not user_data:
            return AuthResponse(success=False, message="Invalid token")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if analysis belongs to user
        cursor.execute("""
            SELECT id FROM analyses 
            WHERE id = %s AND user_id = %s
        """, (analysis_id, user_data['id']))

        if not cursor.fetchone():
            cursor.close()
            conn.close()
            return AuthResponse(success=False, message="Analysis not found or not owned by user")

        # Delete the analysis
        cursor.execute("DELETE FROM analyses WHERE id = %s", (analysis_id,))
        conn.commit()
        cursor.close()
        conn.close()

        return AuthResponse(success=True, message="Analysis deleted successfully")

    except Exception as e:
        logger.error(f"Delete analysis error: {e}")
        return AuthResponse(success=False, message="Database connection failed - deletion unavailable")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
