from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer
import re
import nltk
from typing import List, Dict, Any, Optional
import logging
import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import hashlib
import secrets

# Import the model
current_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(current_dir, 'bert-base-uncased-hatexplain-rationale-two')
sys.path.append(models_dir)
from models import Model_Rational_Label

# Setup NLTK data
for dataset in ['punkt', 'punkt_tab']:
    try:
        nltk.data.find(f'tokenizers/{dataset}')
    except LookupError:
        nltk.download(dataset, quiet=True)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Hate Speech Detection API",
    description="API for detecting hate speech in text with clause-level analysis and rationales",
    version="1.0.0"
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
            raise Exception("SUPABASE_DATABASE_URL environment variable not set")
        
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

# Global model variables
tokenizer = None
model = None

class TextInput(BaseModel):
    text: str
    confidence_threshold: float = 0.6

class ClauseAnalysis(BaseModel):
    clause: str
    is_hate_speech: bool
    confidence: float
    hate_speech_probability: float
    rationale_tokens: List[Dict[str, Any]]
    justification: str

class AnalysisResponse(BaseModel):
    original_text: str
    total_clauses: int
    hate_speech_clauses: List[ClauseAnalysis]
    summary: Dict[str, Any]

@app.on_event("startup")
async def load_model():
    """Load the model and tokenizer on startup"""
    global tokenizer, model
    try:
        logger.info("Creating database tables...")
        db_status = create_user_table()
        if db_status:
            logger.info("Database initialization successful")
        else:
            logger.warning("Database initialization failed - authentication endpoints may not work")
        
        logger.info("Loading tokenizer and model...")
        tokenizer = AutoTokenizer.from_pretrained("Hate-speech-CNERG/bert-base-uncased-hatexplain-rationale-two")
        model = Model_Rational_Label.from_pretrained("Hate-speech-CNERG/bert-base-uncased-hatexplain-rationale-two")
        model.eval()
        logger.info("Model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"Failed to load model: {e}")

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

def analyze_clause_for_hate_speech(clause: str) -> Dict[str, Any]:
    """Analyze a single clause for hate speech"""
    try:
        inputs = tokenizer(clause, return_tensors="pt", truncation=True, max_length=512)
        
        with torch.no_grad():
            classification_logits, token_logits = model(
                input_ids=inputs['input_ids'], 
                attention_mask=inputs['attention_mask']
            )
        
        classification_probs = F.softmax(classification_logits, dim=-1)
        predicted_class = torch.argmax(classification_logits, dim=-1)
        confidence = classification_probs[0][predicted_class].item()
        hate_speech_probability = classification_probs[0][1].item()
        
        token_probs = F.softmax(token_logits, dim=-1)
        tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
        
        rationale_tokens = []
        significant_tokens = []
        
        for token, token_prob in zip(tokens, token_probs[0]):
            if token not in ['[CLS]', '[SEP]', '[PAD]']:
                rationale_prob = token_prob[1].item()
                is_rationale = rationale_prob > 0.1
                
                rationale_tokens.append({
                    'token': token.replace('##', ''),
                    'is_rationale': is_rationale,
                    'confidence': rationale_prob
                })
                
                if is_rationale:
                    significant_tokens.append(token.replace('##', ''))
        
        justification = generate_justification(
            clause, predicted_class.item() == 1, confidence, significant_tokens
        )
        
        return {
            'clause': clause,
            'is_hate_speech': predicted_class.item() == 1,
            'confidence': confidence,
            'hate_speech_probability': hate_speech_probability,
            'rationale_tokens': rationale_tokens,
            'justification': justification,
            'significant_tokens': significant_tokens
        }
        
    except Exception as e:
        logger.error(f"Error analyzing clause '{clause}': {e}")
        return {
            'clause': clause,
            'is_hate_speech': False,
            'confidence': 0.0,
            'hate_speech_probability': 0.0,
            'rationale_tokens': [],
            'justification': f"Error during analysis: {str(e)}",
            'significant_tokens': []
        }

def generate_justification(clause: str, is_hate_speech: bool, confidence: float, significant_tokens: List[str]) -> str:
    """Generate a human-readable justification for the prediction"""
    if not is_hate_speech:
        if confidence > 0.9:
            return "This text appears to be neutral or positive with no indicators of hate speech."
        else:
            return f"While some words might seem concerning, the overall context suggests this is not hate speech (confidence: {confidence:.2f})."
    
    justifications = []
    
    if significant_tokens:
        token_text = ", ".join(significant_tokens[:5])
        justifications.append(f"Key concerning words/phrases identified: {token_text}")
    
    if confidence > 0.8:
        justifications.append("High confidence prediction based on language patterns associated with hate speech.")
    elif confidence > 0.6:
        justifications.append("Moderate confidence - some indicators of potentially harmful language.")
    else:
        justifications.append("Low confidence - borderline case that may require human review.")
    
    concerning_patterns = {
        'racial': ['black', 'white', 'asian', 'hispanic', 'race', 'color'],
        'religious': ['muslim', 'christian', 'jewish', 'religion', 'faith'],
        'gender': ['woman', 'man', 'female', 'male', 'gender'],
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

# Authentication endpoints
@app.post("/signup", response_model=AuthResponse)
async def signup(user_data: UserSignup):
    """Sign up a new user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (user_data.email,))
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
        "message": "Hate Speech Detection API is running",
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_text_for_hate_speech(input_data: TextInput):
    """Analyze text for hate speech by splitting into clauses and analyzing each one"""
    if not model or not tokenizer:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        text = input_data.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        clauses = split_text_into_clauses(text)
        if not clauses:
            clauses = [text]
        
        hate_speech_clauses = []
        
        for clause in clauses:
            analysis = analyze_clause_for_hate_speech(clause)
            
            if (analysis['is_hate_speech'] and 
                analysis['hate_speech_probability'] >= input_data.confidence_threshold):
                hate_speech_clauses.append(ClauseAnalysis(**analysis))
        
        total_clauses = len(clauses)
        hate_speech_count = len(hate_speech_clauses)
        
        summary = {
            "total_clauses_analyzed": total_clauses,
            "hate_speech_clauses_found": hate_speech_count,
            "hate_speech_percentage": (hate_speech_count / total_clauses * 100) if total_clauses > 0 else 0,
            "confidence_threshold_used": input_data.confidence_threshold,
            "overall_assessment": "Contains hate speech" if hate_speech_count > 0 else "No hate speech detected",
            "risk_level": (
                "High" if hate_speech_count > total_clauses * 0.5 else
                "Medium" if hate_speech_count > 0 else
                "Low"
            )
        }
        
        return AnalysisResponse(
            original_text=text,
            total_clauses=total_clauses,
            hate_speech_clauses=hate_speech_clauses,
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze-simple")
async def analyze_simple(input_data: TextInput):
    """Simplified endpoint that returns just the hate speech clauses as a list"""
    try:
        result = await analyze_text_for_hate_speech(input_data)
        
        return {
            "hate_speech_detected": len(result.hate_speech_clauses) > 0,
            "hate_speech_clauses": [
                {
                    "text": clause.clause,
                    "confidence": clause.confidence,
                    "justification": clause.justification
                }
                for clause in result.hate_speech_clauses
            ],
            "summary": result.summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
