import {
  ChangeEvent,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { MouseEvent } from "react";
import { getBiasCategoryColor } from "@/lib/api";
import { BiasAnalysisResponse } from "@/types";

export interface FlaggedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  category: string;
  explanation?: string;
  suggestions?: Array<{
    word: string;
    confidence: number;
    reason: string;
  }>;
}

export interface ValidationRule {
  type: "minLength" | "maxLength" | "required" | "custom";
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
  confirmClearThreshold?: number;
  showClearConfirmation?: boolean;
  flaggedWords?: FlaggedWord[];
  onClearHighlights?: () => void;
  // New props for analysis display
  analysisText?: string;
  showAnalysisOutput?: boolean;
  analysisResults?: BiasAnalysisResponse | null;
}

// Default empty validation rules (stable reference)
const DEFAULT_VALIDATION_RULES: ValidationRule[] = [];

// Enhanced text segment interface with direct word index tracking
interface TextSegment {
  text: string;
  categories: string[];
  explanations: string[];
  originalWordIndices: number[]; // Direct references to flagged word indices
}

function createTextSegments(
  text: string,
  flaggedWords: FlaggedWord[]
): TextSegment[] {
  if (!flaggedWords || flaggedWords.length === 0) {
    return [
      {
        text,
        categories: [] as string[],
        explanations: [] as string[],
        originalWordIndices: [] as number[],
      },
    ];
  }

  // Create arrays to track categories, explanations, and word indices at each character position
  const charCategories: string[][] = Array(text.length)
    .fill(null)
    .map(() => []);
  const charExplanations: string[][] = Array(text.length)
    .fill(null)
    .map(() => []);
  const charWordIndices: number[][] = Array(text.length)
    .fill(null)
    .map(() => []);

  // Helper function to find text in the original text when indices are invalid
  const findTextInOriginal = (searchText: string): { start: number; end: number } | null => {
    if (!searchText || !searchText.trim()) return null;
    
    // Clean the search text
    const cleanSearchText = searchText.trim();
    
    // Try exact match first (case-sensitive)
    let index = text.indexOf(cleanSearchText);
    if (index !== -1) {
      return { start: index, end: index + cleanSearchText.length };
    }
    
    // Try case-insensitive match
    index = text.toLowerCase().indexOf(cleanSearchText.toLowerCase());
    if (index !== -1) {
      return { start: index, end: index + cleanSearchText.length };
    }
    
    // Try word-based matching for partial matches
    const words = cleanSearchText.split(/\s+/);
    if (words.length > 1) {
      const firstWord = words[0];
      const lastWord = words[words.length - 1];
      
      const firstIndex = text.toLowerCase().indexOf(firstWord.toLowerCase());
      const lastIndex = text.toLowerCase().lastIndexOf(lastWord.toLowerCase());
      
      if (firstIndex !== -1 && lastIndex !== -1 && lastIndex >= firstIndex) {
        return { 
          start: firstIndex, 
          end: lastIndex + lastWord.length 
        };
      }
    }
    
    return null;
  };

  // Mark categories, explanations, and word indices for each character position
  flaggedWords.forEach((flagged, wordIndex) => {
    let start = flagged.startIndex;
    let end = flagged.endIndex;
    
    // Validate and fix indices
    const isValidIndices = (
      typeof start === 'number' && 
      typeof end === 'number' && 
      start >= 0 && 
      end > start && 
      start < text.length &&
      end <= text.length
    );
    
    if (!isValidIndices) {
      console.warn(`Invalid indices for flagged word "${flagged.word}": start=${start}, end=${end}, text.length=${text.length}`);
      
      // Try to find the text in the original
      const found = findTextInOriginal(flagged.word);
      if (found) {
        start = found.start;
        end = found.end;
        console.log(`Recovered indices for "${flagged.word}": ${start}-${end}`);
      } else {
        console.warn(`Could not find "${flagged.word}" in text, skipping highlighting`);
        return; // Skip this span if we can't locate it
      }
    }
    
    // Double-check bounds after potential recovery
    start = Math.max(0, Math.min(start, text.length - 1));
    end = Math.max(start + 1, Math.min(end, text.length));
    
    // Ensure we have at least one character to highlight
    if (start >= end) {
      end = Math.min(start + 1, text.length);
    }

    for (let i = start; i < end; i++) {
      const categoryArray = charCategories[i];
      const explanationArray = charExplanations[i];
      const wordIndexArray = charWordIndices[i];

      if (categoryArray && !categoryArray.includes(flagged.category)) {
        categoryArray.push(flagged.category);
        if (flagged.explanation && explanationArray) {
          explanationArray.push(flagged.explanation);
        }
        if (wordIndexArray) {
          wordIndexArray.push(wordIndex);
        }
      }
    }
  });

  // Group consecutive characters with same category sets and word indices
  const segments: TextSegment[] = [];

  let currentStart = 0;
  let currentCategories = charCategories[0] || [];
  let currentExplanations = charExplanations[0] || [];
  let currentWordIndices = charWordIndices[0] || [];

  for (let i = 1; i <= text.length; i++) {
    const nextCategories = i < text.length ? charCategories[i] || [] : [];
    const nextExplanations = i < text.length ? charExplanations[i] || [] : [];
    const nextWordIndices = i < text.length ? charWordIndices[i] || [] : [];

    // Check if categories or word indices changed
    const categoriesChanged =
      currentCategories.length !== nextCategories.length ||
      !currentCategories.every((cat) => nextCategories.includes(cat));

    const wordIndicesChanged =
      currentWordIndices.length !== nextWordIndices.length ||
      !currentWordIndices.every((idx) => nextWordIndices.includes(idx));

    if (categoriesChanged || wordIndicesChanged || i === text.length) {
      segments.push({
        text: text.slice(currentStart, i),
        categories: [...currentCategories],
        explanations: [...currentExplanations],
        originalWordIndices: [...currentWordIndices],
      });

      currentStart = i;
      currentCategories = nextCategories;
      currentExplanations = nextExplanations;
      currentWordIndices = nextWordIndices;
    }
  }

  return segments;
}

// Generate gradient CSS for multiple categories
function generateGradientStyle(categories: string[]): React.CSSProperties {
  if (categories.length === 0) return {};

  if (categories.length === 1 && categories[0]) {
    const colors = getBiasCategoryColor(categories[0]);
    return {
      backgroundColor: colors.lightColor,
      borderBottom: `2px solid ${colors.color}`,
      color: colors.color,
      fontWeight: "600",
    };
  }

  // Create gradient for multiple categories
  const colorStops = categories
    .map((category, index) => {
      const colors = getBiasCategoryColor(category);
      const position1 = (index / categories.length) * 100;
      const position2 = ((index + 1) / categories.length) * 100;
      return `${colors.lightColor} ${position1}%, ${colors.lightColor} ${position2}%`;
    })
    .join(", ");

  return {
    background: `linear-gradient(to right, ${colorStops})`,
    borderBottom: `3px solid transparent`,
    borderImage: `linear-gradient(to right, ${categories
      .map((cat) => getBiasCategoryColor(cat).color)
      .join(", ")}) 1`,
    borderImageSlice: 1,
    color: "#333",
    fontWeight: "600",
  };
}

// Smart tooltip positioning component
const SmartTooltip: React.FC<{
  children: React.ReactNode;
  categories: string[];
  explanations: string[];
}> = ({ children, categories, explanations }) => {
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate space available above and below
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const tooltipHeight = 80; // simplified content means smaller height

    // Prefer top, but switch to bottom if not enough space above
    if (spaceAbove >= tooltipHeight + 20) {
      setPosition("top");
    } else if (spaceBelow >= tooltipHeight + 20) {
      setPosition("bottom");
    } else {
      // If neither position has enough space, choose the one with more space
      setPosition(spaceAbove > spaceBelow ? "top" : "bottom");
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
    // Update position after tooltip becomes visible
    setTimeout(updatePosition, 0);
  }, [updatePosition]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  // Position classes and styles
  const positionClass =
    position === "top" ? "bottom-full mb-2" : "top-full mt-2";

  const arrowClass =
    position === "top"
      ? "absolute top-full left-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
      : "absolute bottom-full left-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900";

  // Simplified tooltip content
  const getTooltipContent = () => {
    if (categories.length === 1) {
      return categories[0];
    } else if (categories.length > 1) {
      return `Multiple biases (${categories.length})`;
    }
    return "Bias detected";
  };

  return (
    <span
      ref={triggerRef}
      className="relative cursor-help transition-all duration-200 hover:shadow-md"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...generateGradientStyle(categories),
        borderRadius: "3px",
        padding: "2px 3px",
        margin: "0 1px",
      }}
    >
      {children}

      {/* Simplified smart positioned tooltip */}
      <div
        ref={tooltipRef}
        className={`absolute left-1/2 ${positionClass} bg-gray-900 text-white text-sm px-3 py-2 rounded-md shadow-lg transition-opacity duration-200 z-[10000] pointer-events-none ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transform: "translateX(-50%)",
          minWidth: "auto",
          maxWidth: "none",
          whiteSpace: "nowrap",
        }}
      >
        <div className="font-medium text-center">{getTooltipContent()}</div>

        {/* Dynamic arrow */}
        <div
          className={arrowClass}
          style={{
            transform: "translateX(-50%)",
          }}
        ></div>
      </div>
    </span>
  );
};

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: number }> = ({ size = 24 }) => {
  return (
    <div className="flex items-center justify-center">
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="31.416"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Analysis Output Component (Read-only display with highlighting)
const AnalysisOutput: React.FC<{
  text: string;
  flaggedWords: FlaggedWord[];
  isAnalyzing: boolean;
  onWordClick?: (word: FlaggedWord) => void;
  analysisResults?: BiasAnalysisResponse | null;
  onToggleReasoning?: (wordIndex: number) => void;
}> = ({
  text,
  flaggedWords,
  isAnalyzing,
  onWordClick,
  analysisResults,
  onToggleReasoning,
}) => {
  const renderContent = useCallback(() => {
    if (isAnalyzing) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <LoadingSpinner size={32} />
          <div className="text-gray-500 text-center">
            <div className="font-medium">Analyzing for bias...</div>
            <div className="text-sm text-gray-400 mt-1">
              This may take a few moments
            </div>
          </div>
        </div>
      );
    }

    if (!text) {
      return (
        <div className="text-gray-400 italic">
          Analysis results will appear here after you click "Analyze for Bias"
        </div>
      );
    }

    if (!flaggedWords || flaggedWords.length === 0) {
      return (
        <div className="text-gray-900">
          <div className="text-green-600 font-medium mb-2">
            ✓ No bias detected
          </div>
          <div>{text}</div>
        </div>
      );
    }

    const segments = createTextSegments(text, flaggedWords);

    return (
      <div className="text-gray-900">
        <div className="leading-relaxed">
          {segments.map((segment, index) => {
            const segmentKey = `${index}-${segment.text.slice(
              0,
              10
            )}-${segment.categories.join("-")}`;

            if (
              segment.categories.length > 0 &&
              segment.originalWordIndices.length > 0
            ) {
              // Use the first word index for click handling (after backend deduplication, there should typically be only one)
              const primaryWordIndex = segment.originalWordIndices[0];

              const handleClick = () => {
                if (onToggleReasoning && primaryWordIndex !== undefined) {
                  onToggleReasoning(primaryWordIndex);
                }
              };

              return (
                <SmartTooltip
                  key={segmentKey}
                  categories={segment.categories}
                  explanations={segment.explanations}
                >
                  <span
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleClick}
                    style={{
                      ...generateGradientStyle(segment.categories),
                      borderRadius: "3px",
                      padding: "2px 3px",
                      margin: "0 1px",
                    }}
                  >
                    {segment.text}
                  </span>
                </SmartTooltip>
              );
            } else {
              return <span key={segmentKey}>{segment.text}</span>;
            }
          })}
        </div>
      </div>
    );
  }, [
    text,
    flaggedWords,
    isAnalyzing,
    onWordClick,
    analysisResults,
    onToggleReasoning,
  ]);

  const getBiasCountDisplay = () => {
    if (!flaggedWords || flaggedWords.length === 0) return null;

    const categoryCount =
      analysisResults?.summary?.categories_detected?.length || 0;
    return (
      <div className="text-sm text-orange-600 font-medium">
        ⚠️ {flaggedWords.length} bias issue
        {flaggedWords.length !== 1 ? "s" : ""} detected
        {categoryCount > 0 &&
          ` (${categoryCount} ${
            categoryCount === 1 ? "category" : "categories"
          })`}
      </div>
    );
  };

  return (
    <div className="w-full h-full p-6 bg-white overflow-y-auto">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          Analysis Results
        </h3>
        {getBiasCountDisplay()}
      </div>
      {renderContent()}
    </div>
  );
};

// Reasoning Panel Component
const ReasoningPanel: React.FC<{
  selectedWord: FlaggedWord | null;
  flaggedWords: FlaggedWord[];
  onWordSelect: (word: FlaggedWord) => void;
  expandedItems: Set<number>;
  onToggleExpanded: (index: number) => void;
  isAnalyzing?: boolean;
}> = ({
  selectedWord,
  flaggedWords,
  onWordSelect,
  expandedItems,
  onToggleExpanded,
  isAnalyzing = false,
}) => {
  return (
    <div className="w-full h-full p-6 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Reasoning & Suggestions
        </h3>
      </div>

      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <LoadingSpinner size={28} />
          <div className="text-gray-500 text-center">
            <div className="font-medium">Preparing analysis...</div>
            <div className="text-sm text-gray-400 mt-1">
              Detailed explanations will appear here
            </div>
          </div>
        </div>
      ) : flaggedWords.length === 0 ? (
        <div className="text-gray-400 italic">
          Bias explanations and suggested revisions will appear here
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-3">
            Click on highlighted text or boxes to expand details:
          </div>
          <div className="space-y-2">
            {flaggedWords.map((word, index) => {
              const colors = getBiasCategoryColor(word.category);
              const isExpanded = expandedItems.has(index);

              return (
                <div
                  key={index}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isExpanded
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => onToggleExpanded(index)}
                >
                  {/* Header - always visible */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colors.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        "{word.word}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600">
                        {word.category}
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                      {/* Category badge */}
                      <div>
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          Bias Category:
                        </div>
                        <div
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: colors.lightColor,
                            color: colors.color,
                          }}
                        >
                          {word.category}
                        </div>
                      </div>

                      {/* Explanation */}
                      {word.explanation && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">
                            Why this is problematic:
                          </div>
                          <div className="text-xs text-gray-600 leading-relaxed bg-gray-100 p-2 rounded">
                            {word.explanation}
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {word.suggestions && word.suggestions.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">
                            Suggested revisions:
                          </div>
                          <div className="space-y-1">
                            {word.suggestions.map((suggestion, sugIndex) => (
                              <div
                                key={sugIndex}
                                className="bg-green-50 border border-green-200 p-2 rounded"
                              >
                                <div className="text-xs font-medium text-green-800">
                                  "{suggestion.word}"
                                </div>
                                {suggestion.reason && (
                                  <div className="text-xs text-green-600 mt-1">
                                    {suggestion.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Resize Handle Component
const ResizeHandle: React.FC<{
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
}> = ({ onMouseDown }) => {
  return (
    <div
      className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors relative group"
      onMouseDown={onMouseDown}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 group-hover:bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

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
  analyzeButtonText = "Analyze for Bias",
  clearButtonText = "Clear",
  validateOnChange = true,
  validationRules = DEFAULT_VALIDATION_RULES,
  onValidationChange,
  confirmClearThreshold = 50,
  showClearConfirmation = true,
  flaggedWords = [],
  onClearHighlights,
  analysisText = "",
  showAnalysisOutput = false,
  analysisResults = null,
}: TextInputProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [selectedWord, setSelectedWord] = useState<FlaggedWord | null>(null);

  // Shared state for expanded reasoning items
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Panel width states for resizing
  const [inputWidth, setInputWidth] = useState(50); // Left panel width
  const [rightPanelWidth, setRightPanelWidth] = useState(50); // Right container width
  const [analysisHeight, setAnalysisHeight] = useState(50); // Top right panel height
  const [reasoningHeight, setReasoningHeight] = useState(50); // Bottom right panel height

  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<
    "horizontal" | "vertical" | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Auto-select first word when flagged words change
  useEffect(() => {
    if (flaggedWords.length > 0 && !selectedWord) {
      setSelectedWord(flaggedWords[0] || null);
    } else if (flaggedWords.length === 0) {
      setSelectedWord(null);
      setExpandedItems(new Set()); // Clear expanded items when no flagged words
    }
  }, [flaggedWords, selectedWord]);

  // Function to toggle expanded state of reasoning items
  const toggleExpandedItem = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Resize handling
  const handleMouseDown = useCallback(
    (type: "horizontal" | "vertical") => (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsResizing(true);
      setResizeType(type);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isResizing || !resizeType) return;

      if (resizeType === "horizontal" && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const mouseX = e.clientX - containerRect.left;
        const percentage = (mouseX / containerWidth) * 100;

        const newInputWidth = Math.max(20, Math.min(80, percentage));
        const newRightPanelWidth = 100 - newInputWidth;

        setInputWidth(newInputWidth);
        setRightPanelWidth(newRightPanelWidth);
      } else if (resizeType === "vertical" && rightContainerRef.current) {
        const containerRect = rightContainerRef.current.getBoundingClientRect();
        const containerHeight = containerRect.height;
        const mouseY = e.clientY - containerRect.top;
        const percentage = (mouseY / containerHeight) * 100;

        const newAnalysisHeight = Math.max(20, Math.min(80, percentage));
        const newReasoningHeight = 100 - newAnalysisHeight;

        setAnalysisHeight(newAnalysisHeight);
        setReasoningHeight(newReasoningHeight);
      }
    },
    [isResizing, resizeType]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setResizeType(null);
  }, []);

  useEffect(() => {
    if (isResizing) {
      const handleMove = (e: Event) => {
        if (e instanceof globalThis.MouseEvent) {
          handleMouseMove(e);
        }
      };
      const handleUp = () => {
        handleMouseUp();
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
      return () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Combine default rules with custom rules
  const allRules = useMemo(() => {
    const defaultRules: ValidationRule[] = [
      {
        type: "required",
        message: "Text is required",
        validator: (text: string) => text.trim().length > 0,
      },
      {
        type: "minLength",
        value: minLength,
        message: `Text must be at least ${minLength} characters long`,
        validator: (text: string) => text.trim().length >= minLength,
      },
      {
        type: "maxLength",
        value: maxLength,
        message: `Text must not exceed ${maxLength} characters`,
        validator: (text: string) => text.length <= maxLength,
      },
    ];

    return [...defaultRules, ...validationRules];
  }, [minLength, maxLength, validationRules]);

  const validateText = useCallback(
    (text: string): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];

      for (const rule of allRules) {
        let isRuleValid = false;

        switch (rule.type) {
          case "required":
            isRuleValid = text.trim().length > 0;
            break;
          case "minLength":
            isRuleValid =
              text.trim().length === 0 ||
              text.trim().length >= (rule.value || minLength);
            break;
          case "maxLength":
            isRuleValid = text.length <= (rule.value || maxLength);
            break;
          case "custom":
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
        errors,
      };
    },
    [allRules, minLength, maxLength]
  );

  useEffect(() => {
    if (validateOnChange) {
      const { isValid: valid, errors } = validateText(value);
      setIsValid(valid);
      setValidationErrors(errors);
    }
  }, [value, validateOnChange, validateText]);

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
    if (showClearConfirmation && value.length >= confirmClearThreshold) {
      setShowConfirmDialog(true);
    } else {
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

  const handleWordClick = useCallback((word: FlaggedWord) => {
    setSelectedWord(word);
  }, []);

  useEffect(() => {
    if (showConfirmDialog) {
      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === "Escape") {
          handleCancelClear();
        } else if (e.key === "Enter") {
          handleConfirmClear();
        }
      };

      const handleClickOutside = (e: globalThis.MouseEvent) => {
        if (
          dialogRef.current &&
          !dialogRef.current.contains(e.target as Node)
        ) {
          handleCancelClear();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return undefined;
  }, [showConfirmDialog, handleConfirmClear, handleCancelClear]);

  const isAtLimit = value.length >= maxLength;
  const isNearLimit = value.length >= maxLength * 0.8;
  const characterCountColor = isAtLimit
    ? "text-red-500 font-semibold"
    : isNearLimit
    ? "text-amber-500 font-medium"
    : "text-gray-500";

  return (
    <div className={`h-full ${className}`}>
      <div
        ref={containerRef}
        className="flex h-full"
        style={{ userSelect: isResizing ? "none" : "auto" }}
      >
        {/* Input Panel - Left Side */}
        <div style={{ width: `${inputWidth}%` }} className="flex flex-col">
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-gray-50 z-0"></div>

            <textarea
              ref={textareaRef}
              id="text-input"
              value={value}
              onChange={handleTextChange}
              placeholder={placeholder}
              maxLength={maxLength}
              className="w-full h-full px-6 py-6 placeholder-gray-400 text-gray-900 focus:outline-none resize-none border-0 relative z-10 bg-transparent"
              disabled={disabled || isAnalyzing}
            />
          </div>

          <div className="border-t border-gray-200 px-6 py-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {showClearButton && (
                  <button
                    onClick={handleClearClick}
                    disabled={!value || disabled || isAnalyzing}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {clearButtonText}
                  </button>
                )}

                {showAnalyzeButton && (
                  <button
                    onClick={handleAnalyzeClick}
                    disabled={!value.trim() || disabled || isAnalyzing}
                    className="px-6 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAnalyzing ? "Analyzing..." : analyzeButtonText}
                  </button>
                )}
              </div>

              {showCharacterCount && (
                <div className={`text-sm ${characterCountColor}`}>
                  {value.length} / {maxLength} characters
                </div>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="mt-2">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-600">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Resize Handle */}
        {showAnalysisOutput && (
          <div
            className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors relative group"
            onMouseDown={handleMouseDown("horizontal")}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-400 group-hover:bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Right Panel Container - Stacked Vertically */}
        {showAnalysisOutput && (
          <div
            style={{ width: `${rightPanelWidth}%` }}
            className="flex flex-col"
          >
            <div ref={rightContainerRef} className="flex flex-col h-full">
              {/* Analysis Output Panel - Top */}
              <div style={{ height: `${analysisHeight}%` }} className="min-h-0">
                <AnalysisOutput
                  text={analysisText}
                  flaggedWords={flaggedWords}
                  isAnalyzing={isAnalyzing}
                  onWordClick={handleWordClick}
                  analysisResults={analysisResults}
                  onToggleReasoning={toggleExpandedItem}
                />
              </div>

              {/* Vertical Resize Handle */}
              {flaggedWords.length > 0 && (
                <div
                  className="h-1 bg-gray-300 hover:bg-blue-500 cursor-row-resize transition-colors relative group"
                  onMouseDown={handleMouseDown("vertical")}
                >
                  <div className="absolute inset-x-0 -top-1 -bottom-1" />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-1 bg-gray-400 group-hover:bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              {/* Reasoning Panel - Bottom */}
              {flaggedWords.length > 0 && (
                <div
                  style={{ height: `${reasoningHeight}%` }}
                  className="min-h-0"
                >
                  <ReasoningPanel
                    selectedWord={selectedWord}
                    flaggedWords={flaggedWords}
                    onWordSelect={setSelectedWord}
                    expandedItems={expandedItems}
                    onToggleExpanded={toggleExpandedItem}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clear confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={dialogRef}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Clear
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all text? This action cannot be
              undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
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
