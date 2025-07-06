'use client';

import { useState } from 'react';
import { useAuth, AuthProvider } from './AuthContext';
import AuthForm from './AuthForm';
import Dashboard from './Dashboard';

function MainContent() {
  const { user, isLoading } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // If user is logged in, show dashboard
  if (user) {
    return <Dashboard />;
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    BiasGuard
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">
                    AI-powered content analysis
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setShowAuthForm(true)}
                  className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setShowAuthForm(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div className="text-left">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Detect Bias and Hate Speech in Text
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Use advanced AI to analyze text for hate speech, bias, and harmful content. 
                Perfect for content moderation and research.
              </p>

              {/* Stats Section */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-red-500 mb-1">95%</div>
                  <div className="text-sm text-gray-600 font-medium">Accuracy Rate</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-3xl font-bold text-red-500 mb-1">&lt;4s</div>
                  <div className="text-sm text-gray-600 font-medium">Processing Time</div>
                </div>
              </div>

              <button 
                onClick={() => setShowAuthForm(true)}
                className="bg-red-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-red-600 transition-colors shadow-lg"
              >
                Start Analyzing Text
              </button>
            </div>
            
            {/* Right side - Text input and analyze */}
            <div className="bg-white rounded-xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Try it out</h3>
              </div>
              <textarea
                placeholder="Type or paste your text here to analyze for bias and hate speech..."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none placeholder-gray-500 text-gray-900 transition-all duration-200"
                maxLength={500}
              />
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowAuthForm(true)}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 font-medium"
                >
                  Analyze Text
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      {showAuthForm && (
        <AuthForm onClose={() => setShowAuthForm(false)} />
      )}
    </div>
  );
}

export function LandingPage() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
