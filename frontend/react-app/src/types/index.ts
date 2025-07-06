/**
 * Core Types for Hate Speech Detection App
 *
 * These interfaces define the shape of data flowing through our application.
 * TypeScript helps us catch errors early and provides better IDE support.
 */

// Main interface for text analysis requests
export interface AnalysisRequest {
  text: string;
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
    total_clauses_analyzed: number;
    hate_speech_clauses_found: number;
    hate_speech_percentage: number;
    confidence_threshold_used: number;
    overall_assessment: string;
    risk_level: string;
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

// Bias detection types
export interface BiasSpan {
  text: string;
  category: string;
  explanation: string;
  suggested_revision: string;
  start_index: number;
  end_index: number;
}

export interface BiasAnalysisResponse {
  original_text: string;
  bias_spans: BiasSpan[];
  summary: {
    total_bias_instances: number;
    categories_detected: string[];
    overall_assessment: string;
    risk_level: string;
    text_length: number;
    bias_density: number;
  };
}

// Legacy compatibility for existing UI components
export interface FlaggedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  category: string;
  confidence?: number;
  suggestions: {
    word: string;
    confidence: number;
    reason: string;
  }[];
  explanation: string;
}

export interface AnalysisResult {
  analysisId: string;
  timestamp: string;
  flaggedWords: FlaggedWord[];
  original_text: string;
  bias_spans: BiasSpan[];
  summary: BiasAnalysisResponse["summary"];
}

// Bias categories with their display colors
export const BIAS_CATEGORIES = {
  "Race / Ethnicity": { color: "#ff4444", lightColor: "#ffebee" },
  "Gender / Gender Identity": { color: "#ff6b35", lightColor: "#fff3e0" },
  Age: { color: "#ffa726", lightColor: "#fff8e1" },
  "Religion / Belief System": { color: "#ffcc02", lightColor: "#fffde7" },
  "Sexual Orientation": { color: "#66bb6a", lightColor: "#e8f5e8" },
  "Socioeconomic Status": { color: "#42a5f5", lightColor: "#e3f2fd" },
  "Nationality / Immigration Status": {
    color: "#ab47bc",
    lightColor: "#f3e5f5",
  },
  "Disability (Visible & Invisible)": {
    color: "#ef5350",
    lightColor: "#ffebee",
  },
  "Education Level": { color: "#26c6da", lightColor: "#e0f2f1" },
  "Political Ideology": { color: "#ff7043", lightColor: "#fbe9e7" },
  "Physical Appearance": {
    color: "#8d6e63",
    lightColor: "#efebe9",
  },
} as const;

export type BiasCategory = keyof typeof BIAS_CATEGORIES;

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
