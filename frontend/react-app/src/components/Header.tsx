"use client";

import { useState } from "react";
import { useAuth } from "./AuthContext";
import AuthForm from "./AuthForm";

interface HeaderProps {
  onBack?: (() => void) | undefined;
}

export default function Header({ onBack }: HeaderProps) {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const { user, logout } = useAuth();

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium py-2 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    BiasGuard
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">
                    AI-powered bias detection & inclusive language
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => (window.location.href = "/")}
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
              ) : (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="text-gray-700 hover:text-gray-900 font-medium px-4 py-2 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowAuthForm(true)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showAuthForm && <AuthForm onClose={() => setShowAuthForm(false)} />}
    </>
  );
}
