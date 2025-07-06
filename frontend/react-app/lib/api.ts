import { AnalysisRequest, AnalysisResponse, FlaggedWord } from '@/types';

// Base URL for the backend API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Analyzes text for hate speech using the backend API
 * @param request - The analysis request containing text and optional confidence threshold
 * @returns Promise<AnalysisResponse> - The analysis results
 */
export async function analyzeText(request: AnalysisRequest): Promise<AnalysisResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        confidence_threshold: request.confidence_threshold || 0.6,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing text:', error);
    throw error instanceof Error ? error : new Error('Failed to analyze text');
  }
}

/**
 * Converts analysis results to flagged words format for backward compatibility
 * @param analysisResult - The analysis response from the backend
 * @returns FlaggedWord[] - Array of flagged words
 */
export function convertToFlaggedWords(analysisResult: AnalysisResponse): FlaggedWord[] {
  const flaggedWords: FlaggedWord[] = [];
  
  analysisResult.hate_speech_clauses.forEach((clause) => {
    // Extract individual words from rationale tokens that are marked as rationale
    clause.rationale_tokens.forEach((token) => {
      if (token.is_rationale && token.token.trim().length > 0) {
        // Find the position of this token in the original text
        const originalText = analysisResult.original_text;
        const tokenText = token.token.trim();
        
        // Search for the token in the original text
        const startIndex = originalText.toLowerCase().indexOf(tokenText.toLowerCase());
        
        // If we can't find the exact token, skip it
        if (startIndex === -1) return;
        
        const endIndex = startIndex + tokenText.length;
        
        flaggedWords.push({
          word: tokenText,
          startIndex,
          endIndex,
          category: 'hate_speech',
          confidence: token.confidence,
          suggestions: [
            {
              word: '[Consider rephrasing]',
              confidence: 0.8,
              reason: clause.justification,
            },
          ],
          explanation: clause.justification,
        });
      }
    });
  });

  return flaggedWords;
}

/**
 * Health check for the API
 * @returns Promise<boolean> - True if API is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

/**
 * Simple analysis endpoint for basic use cases
 * @param text - The text to analyze
 * @returns Promise<any> - Simplified analysis results
 */
export async function analyzeSimple(text: string): Promise<unknown> {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in simple analysis:', error);
    throw error instanceof Error ? error : new Error('Failed to analyze text');
  }
}
