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
    <div className={`h-full ${className}`}>
      <textarea
        id="text-input"
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full h-full px-6 py-6 placeholder-gray-400 text-gray-900 focus:outline-none resize-none bg-gray-50 border-0"
        disabled={disabled || isAnalyzing}
      />
    </div>
  );
} 