/**
 * Core Types for Hate Speech Detection App
 * 
 * These interfaces define the shape of data flowing through our application.
 * TypeScript helps us catch errors early and provides better IDE support.
 */

// Main interface for text analysis requests
export interface AnalysisRequest {
  text: string;
  confidence_threshold?: number;
}

// Individual rationale token from the model
export interface RationaleToken {
  token: string;
  is_rationale: boolean;
  confidence: number;
}

// Individual clause analysis from the backend
export interface ClauseAnalysis {
  clause: string;
  is_hate_speech: boolean;
  confidence: number;
  hate_speech_probability: number;
  rationale_tokens: RationaleToken[];
  justification: string;
}

// Response from the backend API
export interface AnalysisResponse {
  original_text: string;
  total_clauses: number;
  hate_speech_clauses: ClauseAnalysis[];
  summary: {
    total_hate_speech_clauses: number;
    highest_confidence: number;
    average_confidence: number;
    most_concerning_clause?: string;
  };
}

// Simplified response for basic analysis
export interface SimpleAnalysisResponse {
  text: string;
  hate_speech_detected: boolean;
  confidence: number;
  hate_speech_clauses: Array<{
    text: string;
    confidence: number;
    justification: string;
  }>;
}

// For backwards compatibility with existing UI components
export interface FlaggedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  category: BiasCategory;
  confidence: number;
  suggestions: WordSuggestion[];
  explanation?: string;
}

export interface WordSuggestion {
  word: string;
  confidence: number;
  reason?: string;
}

export type BiasCategory = 
  | 'hate_speech'
  | 'gender_bias'
  | 'racial_bias'
  | 'age_bias'
  | 'disability_bias'
  | 'religious_bias'
  | 'general_bias';

// UI State management types
export interface AppState {
  inputText: string;
  analysisResult: AnalysisResponse | null;
  isLoading: boolean;
  error: string | null;
  interactedClauses: Set<string>;
}

// For managing the text segments in our UI
export interface TextSegment {
  text: string;
  isFlagged: boolean;
  clauseAnalysis?: ClauseAnalysis;
  key: string;
} 