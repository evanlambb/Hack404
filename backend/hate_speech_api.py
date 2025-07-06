from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import re
import nltk
from typing import List, Dict, Any
import logging
import os
import sys

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
    title="Bias Type Detection API",
    description="API for detecting and classifying bias types in text with clause-level analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variables
tokenizer = None
model = None

# Bias type labels from the model config
BIAS_TYPES = {
    0: "racial",
    1: "religious",
    2: "gender",
    3: "age",
    4: "nationality",
    5: "sexuality",
    6: "socioeconomic",
    7: "educational",
    8: "disability",
    9: "political",
    10: "physical"
}


class TextInput(BaseModel):
    text: str
    confidence_threshold: float = 0.5


class BiasDetection(BaseModel):
    bias_type: str
    confidence: float
    label_id: int


class ClauseAnalysis(BaseModel):
    clause: str
    detected_biases: List[BiasDetection]
    justification: str


class AnalysisResponse(BaseModel):
    original_text: str
    total_clauses: int
    biased_clauses: List[ClauseAnalysis]
    summary: Dict[str, Any]


@app.on_event("startup")
async def load_model():
    """Load the model and tokenizer on startup"""
    global tokenizer, model
    try:
        logger.info("Loading tokenizer and model...")
        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(
            current_dir, 'modernbert-large-bias-type-classifier')

        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
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
                new_clauses.extend([c.strip()
                                   for c in split_clauses if c.strip()])
            current_clauses = new_clauses
        clauses.extend(current_clauses)

    return [clause for clause in clauses if len(clause.split()) >= 3]


def analyze_clause_for_bias(clause: str, confidence_threshold: float) -> Dict[str, Any]:
    """Analyze a single clause for bias types"""
    try:
        inputs = tokenizer(clause, return_tensors="pt",
                           truncation=True, max_length=512)

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits

        # Apply sigmoid for multi-label classification
        probabilities = torch.sigmoid(logits).squeeze()

        detected_biases = []

        for label_id, prob in enumerate(probabilities):
            if prob.item() >= confidence_threshold:
                detected_biases.append(BiasDetection(
                    bias_type=BIAS_TYPES[label_id],
                    confidence=prob.item(),
                    label_id=label_id
                ))

        # Sort by confidence descending
        detected_biases.sort(key=lambda x: x.confidence, reverse=True)

        justification = generate_justification(clause, detected_biases)

        return {
            'clause': clause,
            'detected_biases': detected_biases,
            'justification': justification
        }

    except Exception as e:
        logger.error(f"Error analyzing clause '{clause}': {e}")
        return {
            'clause': clause,
            'detected_biases': [],
            'justification': f"Error during analysis: {str(e)}"
        }


def generate_justification(clause: str, detected_biases: List[BiasDetection]) -> str:
    """Generate a human-readable justification for the bias detection"""
    if not detected_biases:
        return "No significant bias detected in this text."

    justifications = []

    if len(detected_biases) == 1:
        bias = detected_biases[0]
        justifications.append(
            f"Detected {bias.bias_type} bias with {bias.confidence:.2f} confidence.")
    else:
        bias_types = [bias.bias_type for bias in detected_biases]
        justifications.append(
            f"Multiple bias types detected: {', '.join(bias_types)}.")

    # Add specific context based on bias types
    bias_patterns = {
        'racial': ['race', 'ethnicity', 'color', 'black', 'white', 'asian', 'hispanic'],
        'religious': ['muslim', 'christian', 'jewish', 'religion', 'faith', 'church'],
        'gender': ['woman', 'man', 'female', 'male', 'gender', 'she', 'he'],
        'age': ['young', 'old', 'elderly', 'teenager', 'adult', 'age'],
        'nationality': ['american', 'foreign', 'immigrant', 'nationality', 'country'],
        'sexuality': ['gay', 'lesbian', 'homosexual', 'straight', 'lgbt'],
        'socioeconomic': ['poor', 'rich', 'wealthy', 'class', 'income', 'money'],
        'educational': ['smart', 'stupid', 'educated', 'ignorant', 'school', 'college'],
        'disability': ['disabled', 'handicapped', 'blind', 'deaf', 'mental'],
        'political': ['liberal', 'conservative', 'democrat', 'republican', 'politics'],
        'physical': ['fat', 'thin', 'tall', 'short', 'appearance', 'looks']
    }

    detected_categories = []
    clause_lower = clause.lower()

    for bias in detected_biases:
        bias_type = bias.bias_type
        if bias_type in bias_patterns:
            keywords = bias_patterns[bias_type]
            if any(keyword in clause_lower for keyword in keywords):
                detected_categories.append(bias_type)

    if detected_categories:
        justifications.append(
            f"Language patterns suggest potential bias targeting: {', '.join(detected_categories)}.")

    # Add confidence assessment
    max_confidence = max(bias.confidence for bias in detected_biases)
    if max_confidence > 0.8:
        justifications.append("High confidence in bias detection.")
    elif max_confidence > 0.6:
        justifications.append("Moderate confidence in bias detection.")
    else:
        justifications.append("Low confidence - may require human review.")

    return " ".join(justifications)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Bias Type Detection API is running",
        "status": "healthy",
        "model_loaded": model is not None,
        "supported_bias_types": list(BIAS_TYPES.values())
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_text_for_bias(input_data: TextInput):
    """Analyze text for bias types by splitting into clauses and analyzing each one"""
    if not model or not tokenizer:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        text = input_data.text.strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        clauses = split_text_into_clauses(text)
        if not clauses:
            clauses = [text]

        biased_clauses = []
        all_detected_biases = []

        for clause in clauses:
            analysis = analyze_clause_for_bias(
                clause, input_data.confidence_threshold)

            if analysis['detected_biases']:
                biased_clauses.append(ClauseAnalysis(**analysis))
                all_detected_biases.extend(analysis['detected_biases'])

        total_clauses = len(clauses)
        biased_clause_count = len(biased_clauses)

        # Count bias types
        bias_type_counts = {}
        for bias in all_detected_biases:
            bias_type_counts[bias.bias_type] = bias_type_counts.get(
                bias.bias_type, 0) + 1

        summary = {
            "total_clauses_analyzed": total_clauses,
            "biased_clauses_found": biased_clause_count,
            "bias_percentage": (biased_clause_count / total_clauses * 100) if total_clauses > 0 else 0,
            "confidence_threshold_used": input_data.confidence_threshold,
            "overall_assessment": "Contains bias" if biased_clause_count > 0 else "No bias detected",
            "detected_bias_types": bias_type_counts,
            "risk_level": (
                "High" if biased_clause_count > total_clauses * 0.5 else
                "Medium" if biased_clause_count > 0 else
                "Low"
            )
        }

        return AnalysisResponse(
            original_text=text,
            total_clauses=total_clauses,
            biased_clauses=biased_clauses,
            summary=summary
        )

    except Exception as e:
        logger.error(f"Error during analysis: {e}")
        raise HTTPException(
            status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/analyze-simple")
async def analyze_simple(input_data: TextInput):
    """Simplified endpoint that returns just the biased clauses as a list"""
    try:
        result = await analyze_text_for_bias(input_data)

        return {
            "bias_detected": len(result.biased_clauses) > 0,
            "biased_clauses": [
                {
                    "text": clause.clause,
                    "detected_biases": [
                        {
                            "bias_type": bias.bias_type,
                            "confidence": bias.confidence
                        }
                        for bias in clause.detected_biases
                    ],
                    "justification": clause.justification
                }
                for clause in result.biased_clauses
            ],
            "summary": result.summary
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
