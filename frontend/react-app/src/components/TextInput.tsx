import { ChangeEvent, useState, useEffect, useCallback, useMemo, useRef } from 'react';

export interface ValidationRule {
  type: 'minLength' | 'maxLength' | 'required' | 'custom';
  value?: number;
  message: string;
  validator?: (text: string) => boolean;
}

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  onAnalyze?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isAnalyzing?: boolean;
  error?: string | null;
  label?: string;
  maxLength?: number;
  minLength?: number;
  className?: string;
  showCharacterCount?: boolean;
  showClearButton?: boolean;
  showAnalyzeButton?: boolean;
  analyzeButtonText?: string;
  clearButtonText?: string;
  validateOnChange?: boolean;
  validationRules?: ValidationRule[];
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  confirmClearThreshold?: number; // Characters threshold for showing confirmation dialog
  showClearConfirmation?: boolean;
}

// Default empty validation rules (stable reference)
const DEFAULT_VALIDATION_RULES: ValidationRule[] = [];

export default function TextInput({
  value,
  onChange,
  onClear,
  onAnalyze,
  placeholder = "Type or paste your text here...",
  disabled = false,
  isAnalyzing = false,
  error = null,
  label = "Enter text to analyze",
  maxLength = 5000,
  minLength = 5,
  className = "",
  showCharacterCount = true,
  showClearButton = true,
  showAnalyzeButton = true,
  analyzeButtonText = "Analyze Text",
  clearButtonText = "Clear",
  validateOnChange = true,
  validationRules = DEFAULT_VALIDATION_RULES,
  onValidationChange,
  confirmClearThreshold = 50,
  showClearConfirmation = true
}: TextInputProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Combine default rules with custom rules
  const allRules = useMemo(() => {
    const defaultRules: ValidationRule[] = [
      {
        type: 'required',
        message: 'Text is required',
        validator: (text: string) => text.trim().length > 0
      },
      {
        type: 'minLength',
        value: minLength,
        message: `Text must be at least ${minLength} characters long`,
        validator: (text: string) => text.trim().length >= minLength
      },
      {
        type: 'maxLength',
        value: maxLength,
        message: `Text must not exceed ${maxLength} characters`,
        validator: (text: string) => text.length <= maxLength
      }
    ];

    return [...defaultRules, ...validationRules];
  }, [minLength, maxLength, validationRules]);

  // Validation function
  const validateText = useCallback((text: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    for (const rule of allRules) {
      let isRuleValid = false;
      
      switch (rule.type) {
        case 'required':
          isRuleValid = text.trim().length > 0;
          break;
        case 'minLength':
          isRuleValid = text.trim().length === 0 || text.trim().length >= (rule.value || minLength);
          break;
        case 'maxLength':
          isRuleValid = text.length <= (rule.value || maxLength);
          break;
        case 'custom':
          isRuleValid = rule.validator ? rule.validator(text) : true;
          break;
        default:
          isRuleValid = true;
      }
      
      if (!isRuleValid) {
        errors.push(rule.message);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [allRules, minLength, maxLength]);

  // Effect to validate on value change
  useEffect(() => {
    if (validateOnChange) {
      const { isValid: valid, errors } = validateText(value);
      setIsValid(valid);
      setValidationErrors(errors);
    }
  }, [value, validateOnChange, validateText]);

  // Effect to notify parent of validation changes
  useEffect(() => {
    if (onValidationChange && validateOnChange) {
      onValidationChange(isValid, validationErrors);
    }
  }, [isValid, validationErrors, onValidationChange, validateOnChange]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleConfirmClear = useCallback(() => {
    setShowConfirmDialog(false);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  const handleCancelClear = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  const handleClearClick = () => {
    // Check if we need to show confirmation dialog
    if (showClearConfirmation && value.length >= confirmClearThreshold) {
      setShowConfirmDialog(true);
    } else {
      // Clear immediately if no confirmation needed
      if (onClear) {
        onClear();
      }
    }
  };

  const handleAnalyzeClick = () => {
    if (onAnalyze) {
      onAnalyze();
    }
  };

  // Effect to handle keyboard events and click outside for confirmation dialog
  useEffect(() => {
    if (showConfirmDialog) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancelClear();
        } else if (e.key === 'Enter') {
          handleConfirmClear();
        }
      };

      const handleClickOutside = (e: MouseEvent) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
          handleCancelClear();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    // Return undefined for the else case to satisfy TypeScript
    return undefined;
  }, [showConfirmDialog, handleConfirmClear, handleCancelClear]);

  const isAtLimit = value.length >= maxLength;
  const isNearLimit = value.length >= maxLength * 0.8;
  const characterCountColor = isAtLimit 
    ? 'text-red-500 font-semibold' 
    : isNearLimit 
      ? 'text-amber-500 font-medium' 
      : 'text-gray-500';

  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/40 p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <label 
            htmlFor="text-input" 
            className="block text-sm font-semibold text-gray-700 mb-3"
          >
            {label}
          </label>
          <textarea
            id="text-input"
            value={value}
            onChange={handleTextChange}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full h-40 px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 bg-white/50"
            disabled={disabled || isAnalyzing}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          {showCharacterCount && (
            <div className={`text-sm ${characterCountColor} flex items-center gap-1`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {value.length} / {maxLength} characters
            </div>
          )}
          <div className="flex gap-3">
            {showClearButton && (
              <button
                onClick={handleClearClick}
                disabled={!value || isAnalyzing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {clearButtonText}
              </button>
            )}
            {showAnalyzeButton && (
              <button
                onClick={handleAnalyzeClick}
                disabled={!value.trim() || isAnalyzing || !isValid}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 border border-transparent rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {analyzeButtonText}
                  </div>
                )}
              </button>
            )}
          </div>
        </div>

        {/* External Error Display */}
        {error && (
          <div className="rounded-xl bg-gradient-to-r from-red-50 to-pink-50 p-4 border border-red-200/50">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors Display */}
        {validationErrors.length > 0 && validateOnChange && (
          <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 border border-amber-200/50">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Validation {validationErrors.length === 1 ? 'Error' : 'Errors'}
                </h3>
                <div className="mt-2">
                  {validationErrors.map((validationError, index) => (
                    <div key={index} className="text-sm text-amber-700">
                      • {validationError}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div ref={dialogRef} className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Clear Text
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have {value.length} characters of text. Are you sure you want to clear all your text? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 border border-transparent rounded-xl shadow-lg hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
              >
                Clear Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 