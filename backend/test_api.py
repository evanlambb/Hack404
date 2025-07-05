#!/usr/bin/env python3
"""
Test script for the Hate Speech Detection API
Run this after starting the FastAPI server to test the endpoints
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_api():
    """Test the hate speech detection API"""
    
    # Test data
    test_cases = [
        {
            "text": "Hello, how are you today? I hope you're having a great day!",
            "expected": "no hate speech"
        },
        {
            "text": "I hate this weather, but I love spending time with my friends. We should go out for dinner.",
            "expected": "no hate speech"
        },
        {
            "text": "You are such an amazing person and I really appreciate your help.",
            "expected": "no hate speech"
        }
    ]
    
    print("🧪 Testing Hate Speech Detection API")
    print("=" * 50)
    
    # Test health check
    try:
        response = requests.get(f"{API_BASE_URL}/")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print("❌ Health check failed")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure the server is running on port 8000")
        print("   Start the server with: python hate_speech_api.py")
        return
    
    print()
    
    # Test analysis endpoint
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test Case {i}: {test_case['expected']}")
        print(f"Text: '{test_case['text'][:50]}...'")
        
        try:
            payload = {
                "text": test_case["text"],
                "confidence_threshold": 0.6
            }
            
            response = requests.post(f"{API_BASE_URL}/analyze", json=payload)
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Analysis completed")
                print(f"   Total clauses: {result['total_clauses']}")
                print(f"   Hate speech clauses found: {len(result['hate_speech_clauses'])}")
                print(f"   Overall assessment: {result['summary']['overall_assessment']}")
                
                if result['hate_speech_clauses']:
                    print("   Hate speech clauses:")
                    for clause in result['hate_speech_clauses']:
                        print(f"     - '{clause['clause']}' (confidence: {clause['confidence']:.3f})")
                        print(f"       Justification: {clause['justification']}")
                
            else:
                print(f"❌ Analysis failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Request failed: {e}")
        
        print("-" * 30)
    
    # Test simple endpoint
    print("\n🔍 Testing Simple Endpoint")
    test_text = "This is a test message with multiple sentences. I hope this works well for our application."
    
    try:
        payload = {
            "text": test_text,
            "confidence_threshold": 0.5
        }
        
        response = requests.post(f"{API_BASE_URL}/analyze-simple", json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Simple analysis completed")
            print(f"   Hate speech detected: {result['hate_speech_detected']}")
            print(f"   Risk level: {result['summary']['risk_level']}")
        else:
            print(f"❌ Simple analysis failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Simple request failed: {e}")

if __name__ == "__main__":
    test_api()
