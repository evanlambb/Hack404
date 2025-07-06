#!/usr/bin/env python3
"""
Test script for the Bias Detection API
Tests the new Claude-powered bias detection functionality
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{API_BASE_URL}/")
        print(f"Health Check: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Status: {data.get('status')}")
            print(f"✅ Analyzer Loaded: {data.get('analyzer_loaded')}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False


def test_bias_detection():
    """Test the bias detection functionality"""
    test_cases = [
        {
            "name": "No bias - neutral text",
            "text": "The meeting was productive and everyone contributed valuable insights.",
            "expected_bias": False
        },
        {
            "name": "Gender bias",
            "text": "She's being too emotional about this business decision. We need someone more rational.",
            "expected_bias": True
        },
        {
            "name": "Age bias",
            "text": "The old guy probably doesn't understand modern technology anyway.",
            "expected_bias": True
        },
        {
            "name": "Mixed content",
            "text": "The team performed well. However, the female manager seemed overly aggressive in her presentation style.",
            "expected_bias": True
        }
    ]

    print("\n🔬 Testing Bias Detection with Claude")
    print("=" * 50)

    for test_case in test_cases:
        print(f"\nTest: {test_case['name']}")
        print(f"Text: {test_case['text']}")

        try:
            payload = {"text": test_case['text']}
            response = requests.post(f"{API_BASE_URL}/analyze", json=payload)

            if response.status_code == 200:
                result = response.json()
                bias_found = len(result['bias_spans']) > 0

                print(f"Status: ✅ Success")
                print(f"Bias detected: {bias_found}")
                print(f"Number of bias spans: {len(result['bias_spans'])}")

                if result['bias_spans']:
                    print("Detected bias spans:")
                    for span in result['bias_spans']:
                        print(f"  - '{span['text']}' ({span['category']})")
                        print(f"    Explanation: {span['explanation']}")
                        print(f"    Suggested: {span['suggested_revision']}")

                print(f"Summary: {result['summary']['overall_assessment']}")
                print(f"Risk Level: {result['summary']['risk_level']}")

                # Verify expectation
                if bias_found == test_case['expected_bias']:
                    print("✅ Result matches expectation")
                else:
                    print("⚠️  Result doesn't match expectation")

            else:
                print(f"❌ Request failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(
                        f"Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    print(f"Raw response: {response.text}")

        except Exception as e:
            print(f"❌ Test error: {e}")

        print("-" * 30)


def test_simple_endpoint():
    """Test the simplified endpoint"""
    print("\n🔬 Testing Simple Endpoint")
    print("=" * 50)

    text = "All immigrants are taking our jobs and should go back where they came from."

    try:
        payload = {"text": text}
        response = requests.post(
            f"{API_BASE_URL}/analyze-simple", json=payload)

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Simple endpoint works")
            print(f"Bias detected: {result.get('bias_detected', False)}")
            print(f"Number of spans: {len(result.get('bias_spans', []))}")
        else:
            print(f"❌ Simple endpoint failed: {response.status_code}")

    except Exception as e:
        print(f"❌ Simple endpoint error: {e}")


def main():
    """Run all tests"""
    print("🧪 Claude-Powered Bias Detection API Test Suite")
    print("=" * 60)

    # Check if API key is set
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("❌ ANTHROPIC_API_KEY environment variable not set!")
        print("Please set your Anthropic API key in the .env file")
        return

    # Test health check first
    if not test_health_check():
        print("❌ Health check failed, cannot proceed with tests")
        return

    # Test bias detection
    test_bias_detection()

    # Test simple endpoint
    test_simple_endpoint()

    print("\n✨ Test suite completed!")


if __name__ == "__main__":
    main()
