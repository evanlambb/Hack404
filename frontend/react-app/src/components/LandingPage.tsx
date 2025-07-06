'use client';

import { useState } from 'react';
import { BiasDetectionApp } from './BiasDetectionApp';

export function LandingPage() {
  // Explicitly set to false to ensure landing page shows first
  const [showTool, setShowTool] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGetStarted = () => {
    setShowTool(true);
  };

  const handleDemoClick = () => {
    setShowTool(true);
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setEmail('');
    alert('Thank you for joining our waitlist!');
  };

  // Show the tool if requested
  if (showTool) {
    return <BiasDetectionApp />;
  }

  // Default: Show landing page
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center transform hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900 tracking-tight">HateSpeech AI</span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-10">
              <a href="#" className="text-slate-600 hover:text-slate-900 text-sm font-medium tracking-wide transition-colors">Product</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 text-sm font-medium tracking-wide transition-colors">Resources</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 text-sm font-medium tracking-wide transition-colors">Features</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 text-sm font-medium tracking-wide transition-colors">Pricing</a>
              <a href="#" className="text-slate-600 hover:text-slate-900 text-sm font-medium tracking-wide transition-colors">Contact</a>
            </nav>

            <div className="flex items-center space-x-4">
              <button className="text-sm text-slate-700 hover:text-slate-900 font-medium px-4 py-2 transition-colors">
                Request Demo
              </button>
              <button 
                onClick={handleGetStarted}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Get Started for free
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Two Column Layout */}
      <section className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Column - Hero Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
                  More than hate speech detection.<br />
                  Preserve <span className="text-red-600">what's safe</span>.
                </h1>
                
                <p className="text-xl text-slate-600 leading-relaxed max-w-lg">
                  HateSpeech AI researchers use advanced machine learning models to ensure every piece of content is safe for your community.
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-12">
                <div>
                  <div className="text-4xl font-bold text-red-600">94%</div>
                  <div className="text-sm text-slate-600 font-medium">Accuracy</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-900">1M+</div>
                  <div className="text-sm text-slate-600 font-medium">Texts Analyzed</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-900">50k+</div>
                  <div className="text-sm text-slate-600 font-medium">Communities</div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={handleGetStarted}
                  className="bg-red-600 text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Get started for free
                </button>
                <form onSubmit={handleWaitlist} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-white text-slate-700 px-6 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? 'Joining...' : 'Join waitlist'}
                  </button>
                </form>
              </div>

              {/* Feature List */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 font-medium">The world's most accurate hate speech detector</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 font-medium">Real-time content moderation API</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 font-medium">Detailed explanations and confidence scores</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-700 font-medium">Integrate with your existing workflow</span>
                </div>
              </div>
            </div>

            {/* Right Column - Demo Interface */}
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Demo Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-slate-600">Hate Speech Detection</span>
                </div>
              </div>

              {/* Demo Content */}
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Paste your text
                  </label>
                  <textarea
                    className="w-full h-32 p-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none bg-slate-50 text-slate-700"
                    placeholder="Enter text to analyze for hate speech..."
                    value="[PLACEHOLDER] This is some sample text that would be analyzed for hate speech. Click the button below to try the real analyzer!"
                    readOnly
                  />
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-slate-600">
                    Try an example:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      Social Media Post
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      Forum Comment
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                      Product Review
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleDemoClick}
                  className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Analyze for Hate Speech
                </button>

                <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
                  0/5,000 characters
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xl font-bold">HateSpeech AI</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-lg">
                Advanced AI technology for creating safer, more inclusive online spaces through intelligent content analysis.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg">Product</h4>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors text-lg">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-lg">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-lg">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg">Resources</h4>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors text-lg">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-lg">Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-lg">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg">Company</h4>
              <ul className="space-y-3 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors text-lg">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-lg">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors text-lg">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p className="text-lg">&copy; 2024 HateSpeech AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 