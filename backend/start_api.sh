#!/bin/bash

# Hate Speech Detection API Startup Script

echo "🚀 Starting Hate Speech Detection API..."

# Check if virtual environment exists
if [ ! -d "../.venv" ]; then
    echo "❌ Virtual environment not found. Please create one first:"
    echo "   python -m venv ../.venv"
    echo "   source ../.venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
source ../.venv/bin/activate

# Install dependencies if needed
echo "📦 Checking dependencies..."
pip install -r requirements.txt --quiet

# Download NLTK data if needed
echo "📚 Downloading NLTK data..."
python -c "import nltk; nltk.download('punkt', quiet=True)"

# Start the API server
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📖 API documentation will be available at http://localhost:8000/docs"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

uvicorn hate_speech_api:app --host 0.0.0.0 --port 8000 --reload
