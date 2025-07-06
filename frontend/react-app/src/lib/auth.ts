const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AuthResponse {
  success: boolean;
  message: string;
  user_id?: number;
  token?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  token: string;
}

export async function signup(email: string, password: string, name: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error('Signup failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Signup error:', error);
    return {
      success: false,
      message: 'Network error during signup',
    };
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Network error during login',
    };
  }
}
