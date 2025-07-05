'use client';

import { useState, useCallback } from 'react';
import { AnalysisResponse, AnalysisRequest, FlaggedWord } from '@/types';
import { analyzeText } from '@/lib/api';
import Header from './Header';
import TextInput from './TextInput';
import { IssuesPanel } from './IssuesPanel';

export function BiasDetectionApp() {
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIssue, setHighlightedIssue] = useState<FlaggedWord | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setHighlightedIssue(null);

    try {
      const request: AnalysisRequest = {
        text: text.trim(),
        options: {
          sensitivity: 'medium',
          categories: ['gender_bias', 'racial_bias', 'religious_bias', 'general_bias']
        }
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
    setHighlightedIssue(null);
  }, []);

  const handleWordReplace = useCallback((originalWord: string, newWord: string) => {
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
  }, [text, analysisResult]);

  const handleIssueClick = useCallback((issue: FlaggedWord) => {
    setHighlightedIssue(issue);
  }, []);

  // Create highlighted text with proper formatting
  const getHighlightedText = () => {
    if (!analysisResult || analysisResult.flaggedWords.length === 0) {
      return text;
    }

    let highlightedText = text;
    const flaggedWords = [...analysisResult.flaggedWords].sort((a, b) => b.startIndex - a.startIndex);
    
    flaggedWords.forEach((fw) => {
      const beforeText = highlightedText.slice(0, fw.startIndex);
      const flaggedWord = highlightedText.slice(fw.startIndex, fw.endIndex);
      const afterText = highlightedText.slice(fw.endIndex);
      
      const isHighlighted = highlightedIssue?.word === fw.word;
      const highlightClass = isHighlighted 
        ? 'bg-red-200 border-2 border-red-400 px-1 rounded font-medium'
        : 'bg-yellow-200 px-1 rounded';
      
      highlightedText = `${beforeText}<span class="${highlightClass}">${flaggedWord}</span>${afterText}`;
    });

    return highlightedText;
  };

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
                {/* <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Bias Detection Tool
                </h1> */}
                <p className="text-lg text-gray-600">
                  Analyze text for potential bias and get suggestions for improvement
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
                  analyzeButtonText="Analyze Text"
                  clearButtonText="Clear"
                />
              </div>
            </div>

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
                    />
                  </div>

                                  {/* Legend */}
                {analysisResult && analysisResult.flaggedWords.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200/50">
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="bg-gradient-to-r from-yellow-200 to-amber-200 px-3 py-1 rounded-full text-xs font-medium shadow-sm">highlighted</span>
                        <span className="font-medium">Flagged words</span>
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
      </main>
    </div>
  );
} 