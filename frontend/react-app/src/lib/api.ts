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
 * @returns Promise<unknown> - Simplified analysis results
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

/**
 * Save analysis result to the database
 * @param text - The analyzed text
 * @param result - The analysis result
 * @param title - Optional title for the analysis
 * @returns Promise<boolean> - Success status
 */
export async function saveAnalysis(text: string, result: any, title?: string): Promise<boolean> {
  try {
    console.log('saveAnalysis called with:', { text: text.slice(0, 50) + '...', title, hasResult: !!result });
    const headers = createAuthHeaders();
    console.log('Auth headers:', headers);
    
    const response = await fetch(`${API_BASE_URL}/save-analysis`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, result, title }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Save analysis error:', errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Save analysis response:', data);
    return data.success;
  } catch (error) {
    console.error('Error saving analysis:', error);
    return false;
  }
}

/**
 * Get saved analyses for the authenticated user
 * @returns Promise<SavedAnalysis[]> - Array of saved analyses
 */
export async function getSavedAnalyses(): Promise<SavedAnalysis[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/saved-analyses`, {
      method: 'GET',
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting saved analyses:', error);
    return [];
  }
}

/**
 * Delete a saved analysis
 * @param analysisId - The ID of the analysis to delete
 * @returns Promise<boolean> - Success status
 */
export async function deleteAnalysis(analysisId: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/delete-analysis/${analysisId}`, {
      method: 'DELETE',
      headers: createAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error deleting analysis:', error);
    return false;
  }
}

// Auth interfaces
interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  user_id?: number;
  token?: string;
}

interface SavedAnalysis {
  id: number;
  user_id: number;
  text: string;
  result: any;
  title?: string;
  created_at: string;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    // First try to get token from direct storage
    const token = localStorage.getItem('auth_token');
    if (token) return token;
    
    // Fallback to getting token from user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.token || null;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }
  return null;
}

/**
 * Create auth headers
 */
function createAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}
