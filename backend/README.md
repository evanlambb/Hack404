# Hate Speech Detection API

A FastAPI-based web service that analyzes text for hate speech detection with clause-level analysis and detailed rationales. The API splits input text into sentences and clauses, analyzes each one individually, and returns detailed information about any detected hate speech along with justifications.

## Features

- 🔍 **Clause-level Analysis**: Automatically splits text into sentences and clauses for granular analysis
- 🎯 **High Accuracy**: Uses a fine-tuned BERT model specifically trained for hate speech detection
- 📊 **Detailed Rationales**: Provides token-level explanations for why text is classified as hate speech
- 🚀 **Fast API**: RESTful API with automatic documentation and validation
- 🔧 **Configurable**: Adjustable confidence thresholds for different use cases
- 📱 **Frontend Ready**: CORS-enabled with simple JSON responses perfect for web applications

## Quick Start

### 1. Setup Environment

```bash
# Clone/navigate to the project directory
cd /path/to/Hack404/backend

# Activate virtual environment
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"
```

### 2. Start the API Server

```bash
# Option 1: Use the startup script
./start_api.sh

# Option 2: Start manually
uvicorn hate_speech_api:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Test the API

```bash
# Run basic tests
python test_api.py

# Run advanced tests
python test_api_advanced.py

# Or visit the interactive documentation
open http://localhost:8000/docs
```

## API Endpoints

### 🏥 Health Check
```
GET /
```
Returns API status and model loading state.

**Response:**
```json
{
    "message": "Hate Speech Detection API is running",
    "status": "healthy", 
    "model_loaded": true
}
```

### 🔍 Detailed Analysis
```
POST /analyze
```
Comprehensive analysis with full details and rationales.

**Request:**
```json
{
    "text": "Your text to analyze here",
    "confidence_threshold": 0.6
}
```

**Response:**
```json
{
    "original_text": "Your text to analyze here",
    "total_clauses": 3,
    "hate_speech_clauses": [
        {
            "clause": "problematic clause text",
            "is_hate_speech": true,
            "confidence": 0.85,
            "hate_speech_probability": 0.85,
            "rationale_tokens": [
                {
                    "token": "word",
                    "is_rationale": true,
                    "confidence": 0.92
                }
            ],
            "justification": "Detailed explanation of why this is flagged"
        }
    ],
    "summary": {
        "total_clauses_analyzed": 3,
        "hate_speech_clauses_found": 1,
        "hate_speech_percentage": 33.3,
        "confidence_threshold_used": 0.6,
        "overall_assessment": "Contains hate speech",
        "risk_level": "Medium"
    }
}
```

### ⚡ Simple Analysis
```
POST /analyze-simple
```
Simplified response for frontend integration.

**Request:**
```json
{
    "text": "Your text to analyze here",
    "confidence_threshold": 0.6
}
```

**Response:**
```json
{
    "hate_speech_detected": true,
    "hate_speech_clauses": [
        {
            "text": "problematic clause",
            "confidence": 0.85,
            "justification": "Reason for flagging"
        }
    ],
    "summary": {
        "overall_assessment": "Contains hate speech",
        "risk_level": "Medium",
        "hate_speech_percentage": 33.3
    }
}
```

## Frontend Integration

### JavaScript/React Example

```javascript
const analyzeText = async (text, threshold = 0.6) => {
    try {
        const response = await fetch('http://localhost:8000/analyze-simple', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                confidence_threshold: threshold
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error analyzing text:', error);
        throw error;
    }
};

// Usage in React component
const handleTextAnalysis = async () => {
    const userText = document.getElementById('textInput').value;
    
    try {
        const result = await analyzeText(userText);
        
        if (result.hate_speech_detected) {
            console.log('⚠️ Hate speech detected!');
            console.log('Risk level:', result.summary.risk_level);
            
            result.hate_speech_clauses.forEach((clause, index) => {
                console.log(`Issue ${index + 1}: "${clause.text}"`);
                console.log(`Reason: ${clause.justification}`);
                console.log(`Confidence: ${(clause.confidence * 100).toFixed(1)}%`);
            });
        } else {
            console.log('✅ No hate speech detected');
        }
    } catch (error) {
        console.error('Analysis failed:', error);
    }
};
```

### Python Client Example

```python
import requests

class HateSpeechDetector:
    def __init__(self, api_url="http://localhost:8000"):
        self.api_url = api_url
    
    def analyze(self, text, threshold=0.6, detailed=False):
        endpoint = "/analyze" if detailed else "/analyze-simple"
        
        response = requests.post(
            f"{self.api_url}{endpoint}",
            json={
                "text": text,
                "confidence_threshold": threshold
            }
        )
        
        response.raise_for_status()
        return response.json()
    
    def is_safe(self, text, threshold=0.6):
        result = self.analyze(text, threshold)
        return not result.get("hate_speech_detected", False)

# Usage
detector = HateSpeechDetector()

# Quick check
text = "Your text here"
if detector.is_safe(text):
    print("✅ Text is safe")
else:
    result = detector.analyze(text)
    print(f"⚠️ Risk level: {result['summary']['risk_level']}")
    for clause in result['hate_speech_clauses']:
        print(f"Issue: {clause['text']}")
        print(f"Reason: {clause['justification']}")
```

## Configuration

### Confidence Thresholds

- **0.9+**: Very high confidence - only the most obvious cases
- **0.7-0.9**: High confidence - recommended for most applications
- **0.5-0.7**: Medium confidence - may include some false positives
- **0.3-0.5**: Low confidence - useful for flagging for human review
- **Below 0.3**: Very sensitive - high false positive rate

### Risk Levels

- **High**: >50% of clauses contain hate speech
- **Medium**: Some hate speech detected but <50% of content
- **Low**: No hate speech detected

## Model Information

This API uses a fine-tuned BERT model specifically trained for hate speech detection with rationale extraction:

- **Base Model**: `bert-base-uncased`
- **Specialized Training**: HatEXplain dataset for rationale-aware hate speech detection
- **Capabilities**: 
  - Binary classification (hate speech vs. not hate speech)
  - Token-level rationale extraction
  - High accuracy across diverse text types

## Production Deployment

### Security Considerations

1. **CORS**: Update CORS settings for your domain in production
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Authentication**: Consider adding API keys for access control
4. **HTTPS**: Always use HTTPS in production
5. **Input Validation**: Additional input sanitization for production use

### Performance Optimization

1. **Model Loading**: Consider model caching strategies for multiple workers
2. **Batch Processing**: Implement batch endpoints for multiple texts
3. **Monitoring**: Add logging and metrics collection
4. **Scaling**: Use load balancers and multiple instances for high traffic

### Environment Variables

```bash
# Optional environment variables for production
export API_HOST=0.0.0.0
export API_PORT=8000
export MODEL_CACHE_DIR=/path/to/model/cache
export LOG_LEVEL=INFO
```

## Troubleshooting

### Common Issues

1. **Model Loading Errors**:
   ```bash
   # Ensure you have enough memory (>4GB RAM recommended)
   # Check internet connection for initial model download
   ```

2. **NLTK Data Missing**:
   ```bash
   python -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"
   ```

3. **Port Already in Use**:
   ```bash
   # Kill existing processes
   pkill -f uvicorn
   # Or use a different port
   uvicorn hate_speech_api:app --port 8001
   ```

4. **Memory Issues**:
   ```bash
   # Monitor memory usage
   htop
   # Consider using CPU-only inference for lower memory usage
   ```

## Development

### Adding New Features

1. **Custom Preprocessing**: Modify `split_text_into_clauses()` function
2. **Additional Models**: Add support for other hate speech detection models
3. **New Endpoints**: Add specialized endpoints for different use cases
4. **Enhanced Rationales**: Improve justification generation logic

### Testing

```bash
# Run all tests
python test_api.py
python test_api_advanced.py

# Test specific endpoints
curl -X POST "http://localhost:8000/analyze-simple" \
     -H "Content-Type: application/json" \
     -d '{"text": "test message", "confidence_threshold": 0.6}'
```

## License

This project is part of the Hack404 repository. Please refer to the main repository for licensing information.

## Support

For issues, questions, or contributions, please refer to the main Hack404 repository or contact the development team.
