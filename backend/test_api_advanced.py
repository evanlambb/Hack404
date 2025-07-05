#!/usr/bin/env python3
"""
Advanced test script for the Hate Speech Detection API
Tests with more complex examples including edge cases
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_advanced_cases():
    """Test with more complex and varied examples"""
    
    test_cases = [
        {
            "name": "Neutral text",
            "text": "The weather is nice today. I'm going to the store to buy groceries.",
            "expected_hate": False
        },
        {
            "name": "Negative but not hate speech",
            "text": "I hate this traffic jam. It's so frustrating when I'm late for work.",
            "expected_hate": False
        },
        {
            "name": "Complex sentence with multiple clauses",
            "text": "I love programming, but sometimes debugging can be frustrating. However, the satisfaction of solving problems makes it worth it.",
            "expected_hate": False
        },
        {
            "name": "Professional feedback",
            "text": "The presentation was well-structured. However, some sections could be improved. Overall, it's a solid foundation for future work.",
            "expected_hate": False
        },
        {
            "name": "Social media style text",
            "text": "Just had the best day ever! Went hiking with friends and the weather was perfect. #blessed #nature #friends",
            "expected_hate": False
        }
    ]
    
    print("🔬 Advanced Testing of Hate Speech Detection API")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['name']}")
        print(f"Text: '{test_case['text']}'")
        print(f"Expected: {'No hate speech' if not test_case['expected_hate'] else 'Hate speech'}")
        
        try:
            payload = {
                "text": test_case["text"],
                "confidence_threshold": 0.5  # Lower threshold for testing
            }
            
            # Test detailed endpoint
            response = requests.post(f"{API_BASE_URL}/analyze", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                
                print(f"📊 Results:")
                print(f"   ✓ Total clauses analyzed: {result['total_clauses']}")
                print(f"   ✓ Hate speech clauses: {len(result['hate_speech_clauses'])}")
                print(f"   ✓ Assessment: {result['summary']['overall_assessment']}")
                print(f"   ✓ Risk level: {result['summary']['risk_level']}")
                
                # Show clause breakdown
                if result['total_clauses'] > 1:
                    print(f"   📝 Clause breakdown:")
                    # We'll make another call to see individual clause analysis
                    individual_results = analyze_individual_clauses(test_case['text'])
                    for j, clause_info in enumerate(individual_results, 1):
                        print(f"      {j}. '{clause_info['clause'][:40]}...' - "
                              f"{'🚨' if clause_info['is_hate'] else '✅'} "
                              f"({clause_info['confidence']:.3f})")
                
                if result['hate_speech_clauses']:
                    print(f"   🚨 Detected hate speech:")
                    for clause in result['hate_speech_clauses']:
                        print(f"      - '{clause['clause']}'")
                        print(f"        Confidence: {clause['confidence']:.3f}")
                        print(f"        Justification: {clause['justification']}")
                
            else:
                print(f"❌ Analysis failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        print("-" * 50)

def analyze_individual_clauses(text):
    """Helper function to analyze how text gets split into clauses"""
    try:
        payload = {"text": text, "confidence_threshold": 0.1}  # Very low threshold to see all
        response = requests.post(f"{API_BASE_URL}/analyze", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            
            # Extract clause information
            clause_info = []
            
            # For this, we need to simulate how the API splits text
            # Since we can't directly access the splitting function, 
            # we'll use the total clauses info we get back
            
            # Add detected hate speech clauses
            for clause in result['hate_speech_clauses']:
                clause_info.append({
                    'clause': clause['clause'],
                    'is_hate': True,
                    'confidence': clause['confidence']
                })
            
            # For non-hate clauses, we can infer from the total count
            # This is a simplified representation
            total_clauses = result['total_clauses']
            hate_clauses = len(result['hate_speech_clauses'])
            safe_clauses = total_clauses - hate_clauses
            
            # Add placeholder info for safe clauses
            if safe_clauses > 0:
                # Simple sentence splitting for display
                import re
                sentences = re.split(r'[.!?]+', text)
                for i, sentence in enumerate(sentences[:safe_clauses]):
                    if sentence.strip():
                        clause_info.append({
                            'clause': sentence.strip(),
                            'is_hate': False,
                            'confidence': 0.0  # We don't have individual confidence for safe clauses
                        })
            
            return clause_info[:total_clauses]  # Limit to actual count
            
    except Exception as e:
        print(f"Error analyzing individual clauses: {e}")
        return []

def test_api_documentation():
    """Test if API documentation is accessible"""
    print("\n📚 Testing API Documentation")
    print("-" * 30)
    
    try:
        response = requests.get(f"{API_BASE_URL}/docs")
        if response.status_code == 200:
            print("✅ API documentation is accessible at http://localhost:8000/docs")
        else:
            print(f"❌ Documentation not accessible: {response.status_code}")
    except Exception as e:
        print(f"❌ Failed to access documentation: {e}")

def show_api_usage_examples():
    """Show example usage for frontend integration"""
    print("\n💻 Frontend Integration Examples")
    print("=" * 40)
    
    print("JavaScript/Fetch API example:")
    print("""
const analyzeText = async (text) => {
    const response = await fetch('http://localhost:8000/analyze-simple', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: text,
            confidence_threshold: 0.6
        })
    });
    
    const result = await response.json();
    return result;
};

// Usage
analyzeText("Your text here").then(result => {
    console.log('Hate speech detected:', result.hate_speech_detected);
    console.log('Risk level:', result.summary.risk_level);
    result.hate_speech_clauses.forEach(clause => {
        console.log('Problematic text:', clause.text);
        console.log('Justification:', clause.justification);
    });
});
""")
    
    print("\nPython requests example:")
    print("""
import requests

def analyze_text(text, threshold=0.6):
    response = requests.post(
        'http://localhost:8000/analyze-simple',
        json={
            'text': text,
            'confidence_threshold': threshold
        }
    )
    return response.json()

# Usage
result = analyze_text("Your text here")
print(f"Risk level: {result['summary']['risk_level']}")
for clause in result['hate_speech_clauses']:
    print(f"Issue: {clause['text']}")
    print(f"Reason: {clause['justification']}")
""")

if __name__ == "__main__":
    test_advanced_cases()
    test_api_documentation()
    show_api_usage_examples()
