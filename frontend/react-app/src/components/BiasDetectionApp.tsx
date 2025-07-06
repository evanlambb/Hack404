'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnalysisResponse, AnalysisRequest } from '@/types';
import { analyzeText, convertToFlaggedWords, saveAnalysis } from '@/lib/api';
import { useAuth } from './AuthContext';
import Header from './Header';
import TextInput from './TextInput';
import { IssuesPanel } from './IssuesPanel';

interface BiasDetectionAppProps {
  initialText?: string;
  onBack?: () => void;
}

export function BiasDetectionApp({ initialText = '', onBack }: BiasDetectionAppProps) {
  const { user } = useAuth();
  const [text, setText] = useState(initialText);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Set initial text when prop changes
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleValidationChange = useCallback((_isValid: boolean, errors: string[]) => {
    setValidationErrors(errors);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const request: AnalysisRequest = {
        text: text.trim(),
        confidence_threshold: 0.6
      };

      const result = await analyzeText(request);
      setAnalysisResult(result);
      
      // Auto-save the analysis to the database if user is authenticated
      if (user?.token) {
        try {
          console.log('Attempting to save analysis for user:', user.id);
          const title = `Analysis - ${new Date().toLocaleDateString()}`;
          const saveResult = await saveAnalysis(text.trim(), result, title);
          console.log('Save result:', saveResult);
        } catch (saveError) {
          console.error('Failed to save analysis:', saveError);
          // Don't show error to user for auto-save failure
        }
      } else {
        console.log('User not authenticated, skipping save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      setAnalysisResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, [text, user?.token, user?.id]);

  const handleClearText = useCallback(() => {
    setText('');
    setAnalysisResult(null);
    setError(null);
  }, []);

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
      // Could do something with the clause here if needed
      console.log('Selected clause:', clause);
    }
  }, [analysisResult]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm">
        <Header onBack={onBack} />
      </div>
      
      {/* Main Content with Fixed Layout */}
      <div className="flex pt-20 h-screen">
        {/* Left Column - Text Input Area - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50 main-scroll-area pr-96 lg:pr-96">
          <div className="h-full p-6 lg:p-8">
            <TextInput
              value={text}
              onChange={setText}
              placeholder="Type or paste your text here..."
              maxLength={5000}
              onValidationChange={handleValidationChange}
            />
          </div>
        </div>

        {/* Right Column - Fixed Issues Panel */}
        <div className="fixed top-20 right-0 bottom-0 w-96 hidden lg:block z-20">            <IssuesPanel
              analysisResult={analysisResult ? {
                ...analysisResult,
                flaggedWords: flaggedWords,
                analysisId: `analysis-${Date.now()}`,
                timestamp: new Date().toISOString(),
                confidence: analysisResult.summary.highest_confidence
              } : null}
              isAnalyzing={isAnalyzing}
              onWordReplace={handleWordReplace}
              onIssueClick={handleIssueClick}
              text={text}
              onClear={handleClearText}
              onAnalyze={handleAnalyze}
              maxLength={5000}
              error={error}
              validationErrors={validationErrors}
            />
        </div>
      </div>

      {/* Mobile Issues Panel */}
      <div className="lg:hidden">
        {(analysisResult || isAnalyzing) && (
          <div className="border-t border-gray-200 bg-white">
            <IssuesPanel
              analysisResult={analysisResult ? {
                ...analysisResult,
                flaggedWords: flaggedWords,
                analysisId: `analysis-${Date.now()}`,
                timestamp: new Date().toISOString(),
                confidence: analysisResult.summary.highest_confidence
              } : null}
              isAnalyzing={isAnalyzing}
              onWordReplace={handleWordReplace}
              onIssueClick={handleIssueClick}
              text={text}
              onClear={handleClearText}
              onAnalyze={handleAnalyze}
              maxLength={5000}
              error={error}
              validationErrors={validationErrors}
            />
          </div>
        )}
      </div>
    </div>
  );
}