"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BiasAnalysisResponse, BiasSpan } from "@/types";
import { analyzeText } from "@/lib/api";
import TextInput, { FlaggedWord } from "@/components/TextInput";
import { IssuesPanel } from "@/components/IssuesPanel";
import { useAuth } from "@/components/AuthContext";

interface BiasDetectionAppProps {
  initialText?: string;
  onBack?: () => void;
}

const BiasDetectionApp: React.FC<BiasDetectionAppProps> = ({
  initialText = "",
  onBack,
}) => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState(initialText);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisResults, setAnalysisResults] =
    useState<BiasAnalysisResponse | null>(null);
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysisOutput, setShowAnalysisOutput] = useState(false);

  // Update input text when initialText prop changes
  useEffect(() => {
    setInputText(initialText);
  }, [initialText]);

  // Convert BiasSpan to FlaggedWord format
  const convertToFlaggedWords = useCallback(
    (biasSpans: BiasSpan[]): FlaggedWord[] => {
      return biasSpans.map((span) => ({
        word: span.text,
        startIndex: span.start_index,
        endIndex: span.end_index,
        category: span.category,
        explanation: span.explanation,
        confidence: 1.0,
        suggestions: [
          {
            word: span.suggested_revision || span.text,
            confidence: 1.0,
            reason: span.explanation,
          },
        ],
      }));
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setShowAnalysisOutput(true);

    try {
      // Use the new simplified API that accepts text directly
      const response = await analyzeText(inputText.trim());
      setAnalysisResults(response);
      setAnalysisText(inputText); // Set the text that was analyzed

      if (response.bias_spans && response.bias_spans.length > 0) {
        const flagged = convertToFlaggedWords(response.bias_spans);
        setFlaggedWords(flagged);
      } else {
        setFlaggedWords([]);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during analysis"
      );
      setAnalysisResults(null);
      setFlaggedWords([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputText, convertToFlaggedWords]);

  const handleClear = useCallback(() => {
    setInputText("");
    setAnalysisText("");
    setAnalysisResults(null);
    setFlaggedWords([]);
    setError(null);
    setShowAnalysisOutput(false);
  }, []);

  const handleClearHighlights = useCallback(() => {
    setFlaggedWords([]);
    setAnalysisResults(null);
  }, []);

  const handleInputChange = useCallback((newText: string) => {
    setInputText(newText);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">BiasGuard</h1>
                <p className="text-red-100 mt-1">
                  Detect and understand potential bias in your text
                </p>
              </div>
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-white hover:text-red-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row">
            {/* Text Input Section */}
            <div className="lg:w-full">
              <div className="h-96 lg:h-[600px]">
                <TextInput
                  value={inputText}
                  onChange={handleInputChange}
                  onClear={handleClear}
                  onAnalyze={handleAnalyze}
                  placeholder="Enter or paste your text here to analyze for potential bias..."
                  isAnalyzing={isAnalyzing}
                  error={error}
                  maxLength={5000}
                  showCharacterCount={true}
                  showClearButton={true}
                  showAnalyzeButton={true}
                  analyzeButtonText="Analyze for Bias"
                  clearButtonText="Clear All"
                  flaggedWords={flaggedWords}
                  onClearHighlights={handleClearHighlights}
                  analysisText={analysisText}
                  showAnalysisOutput={showAnalysisOutput}
                  analysisResults={analysisResults}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiasDetectionApp;
