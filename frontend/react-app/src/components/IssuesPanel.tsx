'use client';

import { AnalysisResponse, FlaggedWord } from '@/types';

interface ExtendedAnalysisResponse extends AnalysisResponse {
  flaggedWords: FlaggedWord[];
  analysisId?: string;
  timestamp?: string;
  confidence?: number;
}

interface IssuesPanelProps {
  analysisResult: ExtendedAnalysisResponse | null;
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

export function IssuesPanel({ 
  analysisResult, 
  isAnalyzing, 
  text,
  onClear,
  onAnalyze,
  maxLength,
  error,
  validationErrors = []
}: IssuesPanelProps) {
  return (
    <div className="w-full lg:w-96 h-full bg-white border-l border-gray-200">
      <div className="h-full flex flex-col">
        {/* Header */}
        {analysisResult && (
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-4">
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    Issues: {analysisResult.summary?.hate_speech_clauses_found || analysisResult.hate_speech_clauses?.filter(clause => clause.is_hate_speech).length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Problematic Phrases:</h3>
              <div className="space-y-2">
                {analysisResult.flaggedWords.map((issue, index) => (
                  <div 
                    key={index} 
                    className="bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors duration-200 group relative"
                    title={issue.explanation || 'Problematic content detected'}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                      <span className="font-medium text-red-800">
                        &ldquo;{issue.word}&rdquo;
                      </span>
                    </div>
                    
                    {/* Tooltip on hover */}
                    {issue.explanation && (
                      <div className="absolute left-0 top-full mt-2 w-full bg-gray-900 text-white text-sm p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                        {issue.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
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