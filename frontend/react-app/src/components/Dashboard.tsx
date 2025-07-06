'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { BiasDetectionApp } from './BiasDetectionApp';

interface SavedAnalysis {
  id: string;
  text: string;
  result: unknown;
  timestamp: Date;
  title?: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);

  useEffect(() => {
    // Load saved analyses from localStorage
    const saved = localStorage.getItem(`analyses_${user?.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedAnalyses(parsed.map((item: SavedAnalysis) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (error) {
        console.error('Error loading saved analyses:', error);
      }
    }
  }, [user?.id]);

  const saveAnalysis = (text: string, result: unknown, title?: string) => {
    const newAnalysis: SavedAnalysis = {
      id: Date.now().toString(),
      text,
      result,
      timestamp: new Date(),
      title: title || `Analysis ${savedAnalyses.length + 1}`
    };

    const updatedAnalyses = [newAnalysis, ...savedAnalyses];
    setSavedAnalyses(updatedAnalyses);
    localStorage.setItem(`analyses_${user?.id}`, JSON.stringify(updatedAnalyses));
  };

  // For demo purposes - this will be connected later
  const addDemoAnalysis = () => {
    saveAnalysis(
      "This is a sample text for demonstration purposes.",
      { summary: { hate_speech_detected: false, confidence: 0.95 } },
      "Demo Analysis"
    );
  };

  // Add a demo analysis on first load if no analyses exist
  useEffect(() => {
    if (savedAnalyses.length === 0 && user?.id) {
      addDemoAnalysis();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteAnalysis = (id: string) => {
    const updatedAnalyses = savedAnalyses.filter(analysis => analysis.id !== id);
    setSavedAnalyses(updatedAnalyses);
    localStorage.setItem(`analyses_${user?.id}`, JSON.stringify(updatedAnalyses));
  };

  if (showAnalyzer) {
    return <BiasDetectionApp />;
  }

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
                    HateZero
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">
                    AI-powered content analysis
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Manage your bias detection analyses</p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowAnalyzer(true)}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors font-medium shadow-lg"
          >
            New Analysis
          </button>
        </div>

        {/* Saved Analyses */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Saved Analyses</h2>
          </div>
          
          {savedAnalyses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 mb-4">No analyses saved yet</p>
              <button
                onClick={() => setShowAnalyzer(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Create Your First Analysis
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {savedAnalyses.map((analysis) => (
                <div key={analysis.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {analysis.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {analysis.text.length > 100 
                          ? `${analysis.text.substring(0, 100)}...` 
                          : analysis.text
                        }
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{analysis.timestamp.toLocaleDateString()}</span>
                        <span>{analysis.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setSelectedAnalysis(analysis)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteAnalysis(analysis.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedAnalysis.title}
              </h2>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Original Text</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-gray-800">{selectedAnalysis.text}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Results</h3>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(selectedAnalysis.result, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                Analyzed on {selectedAnalysis.timestamp.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
