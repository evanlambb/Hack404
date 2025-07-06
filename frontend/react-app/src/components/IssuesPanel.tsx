'use client';

import { AnalysisResponse, FlaggedWord } from '@/types';
import { useState } from 'react';

interface IssuesPanelProps {
  analysisResult: AnalysisResponse | null;
  isAnalyzing: boolean;
  onWordReplace: (originalWord: string, newWord: string) => void;
  onIssueClick?: (issue: FlaggedWord) => void;
  // Text input controls
  text: string;
  onClear: () => void;
  onAnalyze: () => void;
  maxLength: number;
  // Error handling
  error?: string | null;
  validationErrors?: string[];
}

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'gender_bias':
      return {
        bg: 'bg-gradient-to-r from-pink-100 to-rose-100',
        border: 'border-pink-300',
        text: 'text-pink-800',
        badge: 'bg-pink-500',
        icon: '♀'
      };
    case 'racial_bias':
      return {
        bg: 'bg-gradient-to-r from-orange-100 to-amber-100',
        border: 'border-orange-300',
        text: 'text-orange-800',
        badge: 'bg-orange-500',
        icon: '⚡'
      };
    case 'age_bias':
      return {
        bg: 'bg-gradient-to-r from-purple-100 to-violet-100',
        border: 'border-purple-300',
        text: 'text-purple-800',
        badge: 'bg-purple-500',
        icon: '⏰'
      };
    case 'religious_bias':
      return {
        bg: 'bg-gradient-to-r from-emerald-100 to-teal-100',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        badge: 'bg-emerald-500',
        icon: '☪'
      };
    case 'disability_bias':
      return {
        bg: 'bg-gradient-to-r from-blue-100 to-indigo-100',
        border: 'border-blue-300',
        text: 'text-blue-800',
        badge: 'bg-blue-500',
        icon: '♿'
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-100 to-slate-100',
        border: 'border-gray-300',
        text: 'text-gray-800',
        badge: 'bg-gray-500',
        icon: '⚠'
      };
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-red-600 bg-red-100';
  if (confidence >= 0.6) return 'text-amber-600 bg-amber-100';
  return 'text-green-600 bg-green-100';
};

export function IssuesPanel({ 
  analysisResult, 
  isAnalyzing, 
  onWordReplace,
  onIssueClick,
  text,
  onClear,
  onAnalyze,
  maxLength,
  error,
  validationErrors = []
}: IssuesPanelProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

  const toggleIssueExpansion = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIssues(newExpanded);
  };

  const handleWordReplace = (originalWord: string, newWord: string) => {
    onWordReplace(originalWord, newWord);
  };

  const handleIssueClick = (issue: FlaggedWord) => {
    if (onIssueClick) {
      onIssueClick(issue);
    }
  };

  return (
    <div className="w-full lg:w-96 h-full bg-white border-l border-gray-200">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-center">
            <h2 className="text-xl font-bold text-gray-800">
              Issues Found
            </h2>
          </div>

          {analysisResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-700">Analysis Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${analysisResult.confidence * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getConfidenceColor(analysisResult.confidence)}`}>
                    {Math.round(analysisResult.confidence * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-lg font-bold text-emerald-700">{analysisResult.flaggedWords.length}</div>
                  <div className="text-xs text-emerald-600 font-medium">Issues Found</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-lg font-bold text-red-700">
                    {new Set(analysisResult.flaggedWords.map(fw => fw.category)).size}
                  </div>
                  <div className="text-xs text-red-600 font-medium">Categories</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {isAnalyzing && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Analyzing text for bias...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
              </div>
            </div>
          )}

          {!isAnalyzing && (!analysisResult || analysisResult.flaggedWords.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {analysisResult ? 'No Issues Found!' : 'Ready to Analyze'}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {analysisResult 
                  ? 'Your text looks great! No bias or problematic language detected.'
                  : 'Enter some text and click "Analyze Text" to get started.'
                }
              </p>
            </div>
          )}

          {!isAnalyzing && analysisResult && analysisResult.flaggedWords.length > 0 && (
            <div className="space-y-4">
              {analysisResult.flaggedWords.map((issue, index) => {
                const categoryStyle = getCategoryColor(issue.category);
                const isExpanded = expandedIssues.has(index);
                
                return (
                  <div 
                    key={index} 
                    className={`${categoryStyle.bg} ${categoryStyle.border} border rounded-lg hover:shadow-sm transition-all duration-300 cursor-pointer overflow-hidden`}
                    onClick={() => {
                      toggleIssueExpansion(index);
                      handleIssueClick(issue);
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`${categoryStyle.badge} w-8 h-8 rounded-full flex items-center justify-center text-white font-bold`}>
                            {categoryStyle.icon}
                          </div>
                          <div>
                            <h4 className={`font-bold ${categoryStyle.text} text-sm`}>
                              "{issue.word}"
                            </h4>
                            <p className={`text-xs ${categoryStyle.text} opacity-80 capitalize font-medium`}>
                              {issue.category.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${getConfidenceColor(issue.confidence)}`}>
                            {Math.round(issue.confidence * 100)}%
                          </span>
                          <svg 
                            className={`w-5 h-5 ${categoryStyle.text} transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {isExpanded && (                          <div className="space-y-4 animate-fadeIn">
                            <div className="bg-white/70 rounded-lg p-4">
                              <h5 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Why this is problematic:
                              </h5>
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {issue.explanation}
                              </p>
                            </div>

                          <div className="space-y-2">
                            <h5 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              Suggested alternatives:
                            </h5>
                            <div className="space-y-2">
                              {issue.suggestions.map((suggestion, suggestionIndex) => (
                                <button
                                  key={suggestionIndex}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWordReplace(issue.word, suggestion.word);
                                  }}
                                  className="w-full text-left p-3 bg-white/80 hover:bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 group"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <span className="font-semibold text-gray-800 text-sm">
                                        "{suggestion.word}"
                                      </span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                                          {Math.round(suggestion.confidence * 100)}% match
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1">
                                        {suggestion.reason}
                                      </p>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Text Input Controls */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="space-y-4">
            {/* Validation Errors */}
            {(error || (validationErrors && validationErrors.length > 0)) && (
              <div className="space-y-2">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-red-700">{error}</span>
                  </div>
                )}
                {validationErrors && validationErrors.map((validationError, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm font-medium text-amber-700">{validationError}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Character Count */}
            <div className={`text-sm flex items-center gap-1 ${
              text.length >= maxLength 
                ? 'text-red-500 font-semibold' 
                : text.length >= maxLength * 0.8 
                  ? 'text-amber-500 font-medium' 
                  : 'text-gray-500'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {text.length} / {maxLength} characters
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onClear}
                disabled={!text || isAnalyzing}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Clear Text
              </button>
              
              <button
                onClick={onAnalyze}
                disabled={!text.trim() || isAnalyzing}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze for Hate Speech
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 