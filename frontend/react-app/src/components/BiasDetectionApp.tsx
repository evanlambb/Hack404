'use client';

import { useState, useCallback } from 'react';
import { AnalysisResponse, AnalysisRequest, ClauseAnalysis } from '@/types';
import { analyzeText, convertToFlaggedWords } from '@/lib/api';
import Header from './Header';
import TextInput from './TextInput';
import { IssuesPanel } from './IssuesPanel';

export function BiasDetectionApp() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedClause, setHighlightedClause] = useState<ClauseAnalysis | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setHighlightedClause(null);

    try {
      const request: AnalysisRequest = {
        text: text.trim(),
        confidence_threshold: 0.6
      };

      const result = await analyzeText(request);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [text]);

  const handleClearText = useCallback(() => {
    setText('');
    setAnalysisResult(null);
    setError(null);
    setHighlightedClause(null);
  }, []);

  const handleClauseClick = useCallback((clause: ClauseAnalysis) => {
    setHighlightedClause(clause);
  }, []);

  const handleRemoveClause = useCallback((clause: ClauseAnalysis) => {
    const newText = text.replace(clause.clause, '[content removed]');
    setText(newText);
    
    // Update analysis result to remove the clause
    if (analysisResult) {
      const updatedClauses = analysisResult.hate_speech_clauses.filter(
        c => c.clause !== clause.clause
      );
      setAnalysisResult({
        ...analysisResult,
        hate_speech_clauses: updatedClauses,
        original_text: newText,
        summary: {
          ...analysisResult.summary,
          total_hate_speech_clauses: updatedClauses.length
        }
      });
    }
  }, [text, analysisResult]);

  // Create highlighted text with proper formatting
  const getHighlightedText = () => {
    if (!analysisResult || analysisResult.hate_speech_clauses.length === 0) {
      return text;
    }

    let highlightedText = text;
    const hateSpeechClauses = [...analysisResult.hate_speech_clauses]
      .filter(clause => clause.is_hate_speech)
      .sort((a, b) => b.clause.length - a.clause.length); // Sort by length to avoid partial replacements
    
    hateSpeechClauses.forEach((clause) => {
      const isHighlighted = highlightedClause?.clause === clause.clause;
      const highlightClass = isHighlighted 
        ? 'bg-red-200 border-2 border-red-400 px-2 py-1 rounded font-medium cursor-pointer'
        : 'bg-yellow-200 px-2 py-1 rounded cursor-pointer hover:bg-yellow-300';
      
      const regex = new RegExp(clause.clause.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      highlightedText = highlightedText.replace(regex, 
        `<span class="${highlightClass}" data-clause="${clause.clause}">${clause.clause}</span>`
      );
    });

    return highlightedText;
  };

  const handleWordReplace = useCallback((originalWord: string, newWord: string) => {
    const newText = text.replace(new RegExp(`\\b${originalWord}\\b`, 'g'), newWord);
    setText(newText);
    
    // Update analysis result to reflect the change
    if (analysisResult) {
      const updatedClauses = analysisResult.hate_speech_clauses.map(clause => {
        if (clause.clause.includes(originalWord)) {
          return {
            ...clause,
            clause: clause.clause.replace(new RegExp(`\\b${originalWord}\\b`, 'g'), newWord)
          };
        }
        return clause;
      });
      
      setAnalysisResult({
        ...analysisResult,
        hate_speech_clauses: updatedClauses,
        original_text: newText
      });
    }
  }, [text, analysisResult]);

  // Convert analysis result to flagged words format for IssuesPanel compatibility
  const flaggedWords = analysisResult ? convertToFlaggedWords(analysisResult) : [];

  const handleIssueClick = useCallback((issue: { word: string }) => {
    // Find the corresponding clause for the flagged word
    const clause = analysisResult?.hate_speech_clauses.find(c => 
      c.clause.includes(issue.word) && c.is_hate_speech
    );
    if (clause) {
      setHighlightedClause(clause);
    }
  }, [analysisResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      {/* Main Content - Two Column Layout */}
      <main className="w-full h-[calc(100vh-80px)]">
        <div className="flex h-full">
          {/* Left Column - Input and Text Display */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 lg:p-8">
              {/* Description */}
              <div className="mb-8">
                <p className="text-lg text-gray-600">
                  Analyze text for hate speech and get detailed explanations with AI-powered rationale
                </p>
              </div>

              {/* Input Section */}
              <div className="mb-8">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-1">
                  <TextInput
                    value={text}
                    onChange={setText}
                    onClear={handleClearText}
                    onAnalyze={handleAnalyze}
                    isAnalyzing={isAnalyzing}
                    error={error}
                    placeholder="Type or paste your text here..."
                    label="Enter text to analyze"
                    maxLength={5000}
                    showCharacterCount={true}
                    showClearButton={true}
                    showAnalyzeButton={true}
                    analyzeButtonText="Analyze for Hate Speech"
                    clearButtonText="Clear"
                  />
                </div>
              </div>

              {/* Analysis Results Summary */}
              {analysisResult && (
                <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysisResult.total_clauses}</div>
                      <div className="text-sm text-gray-600">Total Clauses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{analysisResult.summary.total_hate_speech_clauses}</div>
                      <div className="text-sm text-gray-600">Hate Speech Detected</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {(analysisResult.summary.highest_confidence * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Highest Confidence</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Text Display with Highlighting */}
              {text && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-300 hover:shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      {analysisResult ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Analyzed Text
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Current Text
                        </>
                      )}
                    </h3>
                    {analysisResult && (
                      <button
                        onClick={() => navigator.clipboard.writeText(text)}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Text
                      </button>
                    )}
                  </div>
                  
                  <div className="prose max-w-none">
                    <div 
                      className="text-gray-900 leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.hasAttribute('data-clause')) {
                          const clauseText = target.getAttribute('data-clause');
                          const clause = analysisResult?.hate_speech_clauses.find(c => c.clause === clauseText);
                          if (clause) {
                            handleClauseClick(clause);
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Legend */}
                  {analysisResult && analysisResult.hate_speech_clauses.some(c => c.is_hate_speech) && (
                    <div className="mt-6 pt-6 border-t border-gray-200/50">
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="bg-gradient-to-r from-yellow-200 to-amber-200 px-3 py-1 rounded-full text-xs font-medium shadow-sm">highlighted</span>
                          <span className="font-medium">Hate speech detected</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-gradient-to-r from-red-200 to-pink-200 border-2 border-red-400 px-3 py-1 rounded-full text-xs font-medium shadow-sm">highlighted</span>
                          <span className="font-medium">Currently selected</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Clause Details */}
              {highlightedClause && (
                <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Selected Clause Analysis</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Clause:</div>
                      <div className="bg-gray-50 rounded-lg p-3 text-gray-900">"{highlightedClause.clause}"</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Justification:</div>
                      <div className="bg-gray-50 rounded-lg p-3 text-gray-900">{highlightedClause.justification}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Confidence:</div>
                        <div className="text-2xl font-bold text-red-600">{(highlightedClause.confidence * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Hate Speech Probability:</div>
                        <div className="text-2xl font-bold text-orange-600">{(highlightedClause.hate_speech_probability * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Key Rationale Tokens:</div>
                      <div className="flex flex-wrap gap-2">
                        {highlightedClause.rationale_tokens
                          .filter(token => token.is_rationale && token.confidence > 0.1)
                          .map((token, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                            >
                              {token.token.replace('##', '')} ({(token.confidence * 100).toFixed(0)}%)
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemoveClause(highlightedClause)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Remove This Clause
                      </button>
                      <button
                        onClick={() => setHighlightedClause(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Issues Panel */}
          <div className="hidden lg:block flex-shrink-0">
            <IssuesPanel
              analysisResult={analysisResult ? {
                originalText: analysisResult.original_text,
                flaggedWords: flaggedWords,
                analysisId: `analysis-${Date.now()}`,
                timestamp: new Date().toISOString(),
                confidence: analysisResult.summary.highest_confidence
              } as any : null}
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
                analysisResult={analysisResult ? {
                  originalText: analysisResult.original_text,
                  flaggedWords: flaggedWords,
                  analysisId: `analysis-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  confidence: analysisResult.summary.highest_confidence
                } as any : null}
                isAnalyzing={isAnalyzing}
                onWordReplace={handleWordReplace}
                onIssueClick={handleIssueClick}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 