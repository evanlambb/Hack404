"use client";

import { AnalysisResult, FlaggedWord } from "@/types";
import { getBiasCategoryColor } from "@/lib/api";

interface IssuesPanelProps {
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  onWordReplace: (originalWord: string, newWord: string) => void;
  onIssueClick?: (issue: FlaggedWord) => void;
  // Text input controls
  text: string;
  onClear: () => void;
  onAnalyze: () => void;
  maxLength: number;
  // Error handling
  error?: string | null;
  validationErrors?: string[];
}

export function IssuesPanel({
  analysisResult,
  isAnalyzing,
  onWordReplace,
  text,
  onClear,
  onAnalyze,
  maxLength,
  error,
  validationErrors = [],
}: IssuesPanelProps) {
  return (
    <div className="w-full lg:w-96 h-full bg-white border-l border-gray-200">
      <div className="h-full flex flex-col">
        {/* Header */}
        {analysisResult && (
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-4">
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    Issues:{" "}
                    {analysisResult.summary?.total_bias_instances ||
                      analysisResult.bias_spans?.length ||
                      0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {analysisResult.summary?.categories_detected?.length || 0}{" "}
                    categories detected
                  </div>
                </div>
              </div>

              {/* Categories detected */}
              {analysisResult.summary?.categories_detected &&
                analysisResult.summary.categories_detected.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Categories Found:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {analysisResult.summary.categories_detected.map(
                        (category, index) => {
                          const colors = getBiasCategoryColor(category);
                          return (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: colors.lightColor,
                                color: colors.color,
                                border: `1px solid ${colors.color}30`,
                              }}
                            >
                              {category}
                            </span>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {isAnalyzing && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">
                  Analyzing text for bias...
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  This may take a moment
                </p>
              </div>
            </div>
          )}

          {!isAnalyzing &&
            (!analysisResult || analysisResult.flaggedWords.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {analysisResult ? "No Issues Found!" : "Ready to Analyze"}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {analysisResult
                    ? "Your text looks great! No bias or problematic language detected."
                    : 'Enter some text and click "Analyze Text" to get started.'}
                </p>
              </div>
            )}

          {!isAnalyzing &&
            analysisResult &&
            analysisResult.flaggedWords.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Bias Detected:
                </h3>
                <div className="space-y-3">
                  {analysisResult.flaggedWords.map((issue, index) => {
                    const colors = getBiasCategoryColor(issue.category);
                    return (
                      <div
                        key={index}
                        className="border rounded-lg p-4 hover:shadow-sm transition-all duration-200 group relative"
                        style={{
                          backgroundColor: colors.lightColor,
                          borderColor: `${colors.color}40`,
                        }}
                      >
                        <div className="space-y-3">
                          {/* Header with category and text */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors.color }}
                              ></div>
                              <span
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: colors.color,
                                  color: "white",
                                }}
                              >
                                {issue.category}
                              </span>
                            </div>
                          </div>

                          {/* Flagged text */}
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700">
                              Flagged text:
                            </div>
                            <div
                              className="font-medium text-sm p-2 rounded border"
                              style={{
                                backgroundColor: "white",
                                borderColor: colors.color,
                                color: colors.color,
                              }}
                            >
                              &ldquo;{issue.word}&rdquo;
                            </div>
                          </div>

                          {/* Explanation */}
                          {issue.explanation && (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700">
                                Why this is problematic:
                              </div>
                              <div className="text-sm text-gray-600 leading-relaxed">
                                {issue.explanation}
                              </div>
                            </div>
                          )}

                          {/* Suggestion */}
                          {issue.suggestions &&
                            issue.suggestions.length > 0 &&
                            issue.suggestions[0]?.word && (
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">
                                  Suggested revision:
                                </div>
                                <div className="bg-white p-2 rounded border border-green-200">
                                  <div className="text-sm text-green-700 font-medium">
                                    &ldquo;{issue.suggestions[0].word}&rdquo;
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    onWordReplace(
                                      issue.word,
                                      issue.suggestions[0]?.word || ""
                                    )
                                  }
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Apply this suggestion
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>

        {/* Text Input Controls */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="space-y-4">
            {/* Validation Errors */}
            {(error || (validationErrors && validationErrors.length > 0)) && (
              <div className="space-y-2">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <svg
                      className="w-4 h-4 text-red-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-red-700">
                      {error}
                    </span>
                  </div>
                )}
                {validationErrors &&
                  validationErrors.map((validationError, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                    >
                      <svg
                        className="w-4 h-4 text-amber-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-amber-700">
                        {validationError}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Character Count */}
            <div
              className={`text-sm flex items-center gap-1 ${
                text.length >= maxLength
                  ? "text-red-500 font-semibold"
                  : text.length >= maxLength * 0.8
                  ? "text-amber-500 font-medium"
                  : "text-gray-500"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {text.length} / {maxLength} characters
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={onClear}
                disabled={!text || isAnalyzing}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Clear Text
              </button>

              <button
                onClick={onAnalyze}
                disabled={!text.trim() || isAnalyzing}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Analyze for Bias
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
