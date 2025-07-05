/**
 * Core Types for Bias Detection App
 * 
 * These interfaces define the shape of data flowing through our application.
 * TypeScript helps us catch errors early and provides better IDE support.
 */

// Main interface for text analysis requests
export interface AnalysisRequest {
  text: string;
  // Optional: specify analysis type or sensitivity level
  options?: {
    sensitivity?: 'low' | 'medium' | 'high';
    categories?: string[];
  };
}

// Response from the backend API
export interface AnalysisResponse {
  originalText: string;
  flaggedWords: FlaggedWord[];
  analysisId: string;
  timestamp: string;
  // Optional: overall confidence score
  confidence?: number;
}

// Individual flagged word with suggestions
export interface FlaggedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  category: BiasCategory;
  confidence: number;
  suggestions: WordSuggestion[];
  // Explanation of why this word was flagged
  explanation?: string;
}

// Thesaurus-based word suggestions
export interface WordSuggestion {
  word: string;
  confidence: number;
  // Why this is a better alternative
  reason?: string;
}

// Categories of bias/hate speech
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
  // Track which words user has interacted with
  interactedWords: Set<string>;
}

// For managing the text segments in our UI
export interface TextSegment {
  text: string;
  isFlagged: boolean;
  flaggedWord?: FlaggedWord;
  key: string; // For React key prop
} 