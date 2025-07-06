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
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer
import re
import nltk
import sys

# Import the new LLM analyzer
from llm_analyzer import LLMBiasAnalyzer, BiasAnalysisResponse, BiasSpan

# Import the BERT model for hate speech detection
current_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(current_dir, 'bert-base-uncased-hatexplain-rationale-two')
sys.path.append(models_dir)
from models import Model_Rational_Label

# Setup NLTK data for hate speech detection
for dataset in ['punkt', 'punkt_tab']:
    try:
        nltk.data.find(f'tokenizers/{dataset}')
    except LookupError:
        nltk.download(dataset, quiet=True)

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
    confidence_threshold: float = 0.6


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


# Hate speech analysis helpers
def split_text_into_clauses(text: str) -> List[str]:
    """Split text into sentences and clauses for analysis"""
    sentences = nltk.sent_tokenize(text)
    
    clauses = []
    clause_patterns = [
        r',\s+(?=\w)', r';\s*', r'\s+and\s+', r'\s+but\s+', r'\s+or\s+',
        r'\s+because\s+', r'\s+since\s+', r'\s+while\s+', r'\s+when\s+',
        r'\s+if\s+', r'\s+although\s+', r'\s+however\s+', r'\s+therefore\s+'
    ]
    
    for sentence in sentences:
        current_clauses = [sentence]
        for pattern in clause_patterns:
            new_clauses = []
            for clause in current_clauses:
                split_clauses = re.split(pattern, clause)
                new_clauses.extend([c.strip() for c in split_clauses if c.strip()])
            current_clauses = new_clauses
        clauses.extend(current_clauses)
    
    return [clause for clause in clauses if len(clause.split()) >= 3]


def analyze_clause_for_hate_speech(clause: str, confidence_threshold: float = 0.6) -> Dict[str, Any]:
    """Analyze a single clause for hate speech"""
    global hate_speech_tokenizer, hate_speech_model
    
    if not hate_speech_tokenizer or not hate_speech_model:
        return {
            'clause': clause,
            'is_hate_speech': False,
            'confidence': 0.0,
            'hate_speech_probability': 0.0,
            'justification': "Hate speech model not loaded"
        }
    
    try:
        inputs = hate_speech_tokenizer(clause, return_tensors="pt", truncation=True, max_length=512)
        
        with torch.no_grad():
            classification_logits, token_logits = hate_speech_model(
                input_ids=inputs['input_ids'], 
                attention_mask=inputs['attention_mask']
            )
        
        classification_probs = F.softmax(classification_logits, dim=-1)
        predicted_class = torch.argmax(classification_logits, dim=-1)
        confidence = classification_probs[0][predicted_class].item()
        hate_speech_probability = classification_probs[0][1].item()
        
        is_hate_speech = predicted_class.item() == 1 and hate_speech_probability >= confidence_threshold
        
        justification = generate_hate_speech_justification(
            clause, is_hate_speech, confidence
        )
        
        return {
            'clause': clause,
            'is_hate_speech': is_hate_speech,
            'confidence': confidence,
            'hate_speech_probability': hate_speech_probability,
            'justification': justification
        }
        
    except Exception as e:
        logger.error(f"Error analyzing clause '{clause}': {e}")
        return {
            'clause': clause,
            'is_hate_speech': False,
            'confidence': 0.0,
            'hate_speech_probability': 0.0,
            'justification': f"Error during analysis: {str(e)}"
        }


def generate_hate_speech_justification(clause: str, is_hate_speech: bool, confidence: float) -> str:
    """Generate a human-readable justification for the hate speech prediction"""
    if not is_hate_speech:
        if confidence > 0.9:
            return "This text appears to be neutral or positive with no indicators of hate speech."
        else:
            return f"While some words might seem concerning, the overall context suggests this is not hate speech (confidence: {confidence:.2f})."
    
    justifications = []
    
    if confidence > 0.8:
        justifications.append("High confidence prediction based on language patterns associated with hate speech.")
    elif confidence > 0.6:
        justifications.append("Moderate confidence - some indicators of potentially harmful language.")
    else:
        justifications.append("Low confidence - borderline case that may require human review.")
    
    concerning_patterns = {
        'racial': ['black', 'white', 'asian', 'hispanic', 'race', 'color', 'brown'],
        'religious': ['muslim', 'christian', 'jewish', 'religion', 'faith'],
        'gender': ['woman', 'man', 'female', 'male', 'gender', 'women', 'bitch'],
        'sexual_orientation': ['gay', 'lesbian', 'homosexual', 'straight'],
        'general_offensive': ['hate', 'kill', 'die', 'stupid', 'idiot']
    }
    
    detected_categories = []
    clause_lower = clause.lower()
    
    for category, keywords in concerning_patterns.items():
        if any(keyword in clause_lower for keyword in keywords):
            detected_categories.append(category.replace('_', ' '))
    
    if detected_categories:
        justifications.append(f"Potentially targets: {', '.join(detected_categories)}")
    
    return " ".join(justifications)


# Global analyzer instances
analyzer = None
hate_speech_tokenizer = None
hate_speech_model = None


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global analyzer, hate_speech_tokenizer, hate_speech_model
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
        analyzer = LLMBiasAnalyzer()
        logger.info("Bias analyzer initialized successfully!")
        
        logger.info("Loading hate speech detection model...")
        hate_speech_tokenizer = AutoTokenizer.from_pretrained("Hate-speech-CNERG/bert-base-uncased-hatexplain-rationale-two")
        hate_speech_model = Model_Rational_Label.from_pretrained("Hate-speech-CNERG/bert-base-uncased-hatexplain-rationale-two")
        hate_speech_model.eval()
        logger.info("Hate speech model loaded successfully!")
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
    global hate_speech_model, hate_speech_tokenizer
    return {
        "message": "Bias Detection API is running",
        "status": "healthy",
        "analyzer_loaded": analyzer is not None,
        "hate_speech_model_loaded": hate_speech_model is not None and hate_speech_tokenizer is not None
    }


@app.post("/analyze", response_model=BiasAnalysisResponse)
async def analyze_text_for_bias(input_data: TextInput):
    """Analyze text for bias using LLM"""
    if not analyzer:
        raise HTTPException(
            status_code=500, detail="Bias analyzer not initialized")

    try:
        text = input_data.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Analyze text using LLM
        result = await analyzer.analyze_text(text)
        return result

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


@app.post("/analyze-hate-speech")
async def analyze_hate_speech(input_data: TextInput):
    """Analyze text for hate speech using BERT model - compatible with Chrome extension"""
    global hate_speech_tokenizer, hate_speech_model
    
    if not hate_speech_tokenizer or not hate_speech_model:
        raise HTTPException(
            status_code=500, detail="Hate speech model not initialized")

    try:
        text = input_data.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Get confidence threshold from input, default to 0.6
        confidence_threshold = getattr(input_data, 'confidence_threshold', 0.6)
        
        # Split text into clauses for analysis
        clauses = split_text_into_clauses(text)
        if not clauses:
            clauses = [text]

        hate_speech_clauses = []

        for clause in clauses:
            analysis = analyze_clause_for_hate_speech(clause, confidence_threshold)
            
            if analysis['is_hate_speech']:
                hate_speech_clauses.append({
                    "text": analysis['clause'],
                    "confidence": analysis['confidence'],
                    "justification": analysis['justification']
                })

        # Generate summary
        total_clauses = len(clauses)
        hate_speech_count = len(hate_speech_clauses)
        
        summary = {
            "total_clauses_analyzed": total_clauses,
            "hate_speech_clauses_found": hate_speech_count,
            "hate_speech_percentage": (hate_speech_count / total_clauses * 100) if total_clauses > 0 else 0,
            "confidence_threshold_used": confidence_threshold,
            "overall_assessment": "Contains hate speech" if hate_speech_count > 0 else "No hate speech detected",
            "risk_level": (
                "High" if hate_speech_count > total_clauses * 0.5 else
                "Medium" if hate_speech_count > 0 else
                "Low"
            )
        }

        # Return format compatible with Chrome extension
        return {
            "hate_speech_detected": len(hate_speech_clauses) > 0,
            "hate_speech_clauses": hate_speech_clauses,
            "summary": summary
        }

    except Exception as e:
        logger.error(f"Error during hate speech analysis: {e}")
        raise HTTPException(
            status_code=500, detail=f"Hate speech analysis failed: {str(e)}")


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
