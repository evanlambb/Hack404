#!/bin/bash

echo "🚀 HateZero Chrome Extension Test Script"
echo "======================================="

# Check if API is running
echo "🔍 Checking if HateZero API is running..."
if curl -s http://localhost:8000/ > /dev/null; then
    echo "✅ API is running on localhost:8000"
else
    echo "❌ API is not running. Please start it first:"
    echo "   cd ../../backend && python hate_speech_api.py"
    exit 1
fi

echo ""
echo "📋 Extension Setup Checklist:"
echo "1. ✅ API is running"
echo "2. 🔄 Load extension in Chrome:"
echo "   - Go to chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select this folder: $(pwd)"
echo ""
echo "3. 🧪 Test the extension:"
echo "   - Open test.html in Chrome"
echo "   - Click the HateZero extension icon"
echo "   - Toggle 'Detection' ON"
echo "   - Toggle 'Auto-Remove' to test both modes"
echo ""
echo "🎯 Features to test:"
echo "   - Auto-Remove Mode: Content disappears automatically with particle effects"
echo "   - Manual Mode: Content is highlighted, hover for details, click to remove"
echo "   - Sensitivity slider changes detection threshold"
echo "   - Rescan button re-processes the page"

# Open test page if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "🌐 Opening test page in default browser..."
    open test.html
fi

echo ""
echo "🎉 HateZero extension is ready for testing!"
