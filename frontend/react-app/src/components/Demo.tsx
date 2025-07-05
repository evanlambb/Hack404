'use client';

import { useState } from 'react';
import { AnalysisResponse } from '@/types';
import { IssuesPanel } from './IssuesPanel';

const sampleAnalysisResult: AnalysisResponse = {
  originalText: "The female engineer was surprisingly competent at her job, unlike what you'd expect from a typical woman in tech. She was definitely not your average girl programmer.",
  flaggedWords: [
    {
      word: "surprisingly",
      startIndex: 26,
      endIndex: 38,
      category: "gender_bias",
      confidence: 0.85,
      suggestions: [
        { word: "remarkably", confidence: 0.9, reason: "More neutral and positive" },
        { word: "exceptionally", confidence: 0.85, reason: "Emphasizes skill without surprise" },
        { word: "highly", confidence: 0.8, reason: "Simple and professional" }
      ],
      explanation: "Using 'surprisingly' implies that competence in women engineers is unexpected, reinforcing gender stereotypes."
    },
    {
      word: "typical woman",
      startIndex: 89,
      endIndex: 102,
      category: "gender_bias",
      confidence: 0.92,
      suggestions: [
        { word: "other professionals", confidence: 0.9, reason: "Gender-neutral comparison" },
        { word: "many engineers", confidence: 0.85, reason: "Focuses on profession, not gender" },
        { word: "some people", confidence: 0.8, reason: "Removes gender specificity" }
      ],
      explanation: "This phrase perpetuates stereotypes about women's capabilities in technical fields."
    },
    {
      word: "girl programmer",
      startIndex: 158,
      endIndex: 174,
      category: "gender_bias",
      confidence: 0.78,
      suggestions: [
        { word: "software engineer", confidence: 0.95, reason: "Professional and gender-neutral" },
        { word: "developer", confidence: 0.9, reason: "Standard industry term" },
        { word: "programmer", confidence: 0.85, reason: "Removes diminutive language" }
      ],
      explanation: "Using 'girl' instead of 'woman' or professional titles can be seen as diminutive and unprofessional."
    }
  ],
  analysisId: "demo-analysis-123",
  timestamp: new Date().toISOString(),
  confidence: 0.85
};

export function Demo() {
  const [text, setText] = useState(sampleAnalysisResult.originalText);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(sampleAnalysisResult);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleWordReplace = (originalWord: string, newWord: string) => {
    const newText = text.replace(new RegExp(`\\b${originalWord}\\b`, 'g'), newWord);
    setText(newText);
    
    // Update analysis result to reflect the change
    if (analysisResult) {
      const updatedFlaggedWords = analysisResult.flaggedWords.filter(
        fw => fw.word !== originalWord
      );
      setAnalysisResult({
        ...analysisResult,
        flaggedWords: updatedFlaggedWords,
        originalText: newText
      });
    }
  };

  const handleIssueClick = (issue: any) => {
    console.log('Issue clicked:', issue);
  };

  const resetDemo = () => {
    setText(sampleAnalysisResult.originalText);
    setAnalysisResult(sampleAnalysisResult);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Bias Detection Demo
          </h1>
          <button
            onClick={resetDemo}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reset Demo
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Column - Text Display */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Sample Text with Bias Issues
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                This demo shows how the bias detection system identifies and highlights problematic language.
                Click on issues in the right panel to see suggestions.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Analyzed Text
                </h3>
                <button
                  onClick={() => navigator.clipboard.writeText(text)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              
              <div className="prose max-w-none">
                <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {text.split(' ').map((word, index) => {
                    const isFlgged = analysisResult?.flaggedWords.some(fw => 
                      fw.word.toLowerCase() === word.toLowerCase().replace(/[.,!?;]$/, '')
                    );
                    
                    return (
                      <span 
                        key={index}
                        className={isFlgged ? 'bg-yellow-200 px-1 rounded' : ''}
                      >
                        {word}{' '}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="bg-yellow-200 px-2 py-1 rounded text-xs">highlighted</span>
                    <span>Flagged words</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Issues Panel */}
        <div className="hidden lg:block flex-shrink-0">
          <IssuesPanel
            analysisResult={analysisResult}
            isAnalyzing={isAnalyzing}
            onWordReplace={handleWordReplace}
            onIssueClick={handleIssueClick}
          />
        </div>
      </div>

      {/* Mobile Issues Panel */}
      <div className="lg:hidden">
        {(analysisResult || isAnalyzing) && (
          <div className="border-t border-gray-200 bg-white">
            <IssuesPanel
              analysisResult={analysisResult}
              isAnalyzing={isAnalyzing}
              onWordReplace={handleWordReplace}
              onIssueClick={handleIssueClick}
            />
          </div>
        )}
      </div>
    </div>
  );
} 