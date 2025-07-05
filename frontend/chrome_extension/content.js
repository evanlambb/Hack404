// Content script that runs on all web pages
class HateSpeechDetector {
    constructor() {
        this.apiUrl = 'http://localhost:8000/analyze-simple';
        this.isEnabled = true;
        this.confidenceThreshold = 0.6;
        this.init();
    }

    async init() {
        // Load settings from storage
        const result = await chrome.storage.sync.get(['isEnabled', 'confidenceThreshold']);
        this.isEnabled = result.isEnabled !== false; // Default to true
        this.confidenceThreshold = result.confidenceThreshold || 0.6;

        if (this.isEnabled) {
            this.scanPage();
        }

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggle') {
                this.toggleDetection();
            } else if (request.action === 'updateThreshold') {
                this.confidenceThreshold = request.threshold;
                this.scanPage();
            }
        });
    }

    async scanPage() {
        // Remove previous highlights
        //this.removeHighlights();

        if (!this.isEnabled) return;

        // Find all text-containing elements, prioritizing leaf nodes and elements with meaningful text
        const allElements = document.querySelectorAll('*');
        const textElements = [];
        
        for (const element of allElements) {
            if (this.shouldSkipElement(element)) continue;
            
            const text = this.getDirectTextContent(element);
            if (text.length > 10) {
                textElements.push({ element, text });
            }
        }
        
        // Sort by element depth (deeper elements first) to avoid conflicts with nested scanning
        textElements.sort((a, b) => this.getElementDepth(b.element) - this.getElementDepth(a.element));
        
        for (const { element, text } of textElements) {
            // Double-check that element wasn't already processed by a nested scan
            if (!element.classList.contains('hate-speech-scanned')) {
                await this.analyzeTextElement(element, text);
            }
        }
    }

    getElementDepth(element) {
        let depth = 0;
        let current = element;
        while (current.parentElement) {
            depth++;
            current = current.parentElement;
        }
        return depth;
    }

    shouldSkipElement(element) {
        // Skip if element is not visible
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return true;
        }
        
        // Skip if element has already been scanned
        if (element.classList.contains('hate-speech-scanned')) {
            return true;
        }
        
        // Skip certain types of elements that shouldn't contain user content
        const tagName = element.tagName.toLowerCase();
        if (['script', 'style', 'noscript', 'meta', 'link', 'title', 'head', 'html', 'body'].includes(tagName)) {
            return true;
        }
        
        // Skip elements that are part of the browser UI or extension UI
        if (element.classList.contains('hate-speech-highlight') || 
            element.closest('[data-extension]') ||
            element.closest('.chrome-extension')) {
            return true;
        }
        
        // Skip input elements and form controls
        if (['input', 'textarea', 'select', 'button'].includes(tagName)) {
            return true;
        }
        
        return false;
    }

    getDirectTextContent(element) {
        // Get the full text content but avoid scanning nested elements that will be scanned separately
        let text = '';
        
        // If the element has no child elements, just return its text content
        if (element.children.length === 0) {
            return element.textContent.trim();
        }
        
        // For elements with children, we need to be more careful
        // We'll get text from text nodes and inline elements, but skip block-level elements
        const inlineElements = ['span', 'a', 'strong', 'em', 'b', 'i', 'u', 'small', 'mark', 'del', 'ins', 'sub', 'sup', 'code'];
        
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                // Include inline elements in the text
                if (inlineElements.includes(tagName)) {
                    text += node.textContent;
                }
                // For block elements, we'll scan them separately, so skip them here
            }
        }
        
        return text.trim();
    }

    async analyzeTextElement(element, text) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    confidence_threshold: this.confidenceThreshold
                })
            });

            if (!response.ok) {
                console.error('API request failed:', response.status);
                return;
            }

            const result = await response.json();
            
            if (result.hate_speech_detected && result.hate_speech_clauses.length > 0) {
                this.highlightHateSpeech(element, result.hate_speech_clauses);
            }
        } catch (error) {
            console.error('Error analyzing text:', error);
        }
    }

    highlightHateSpeech(element, hateSpeechClauses) {
        let originalText = element.textContent;
        let highlightedHTML = originalText;

        // Sort clauses by length (longest first) to avoid partial replacements
        hateSpeechClauses.sort((a, b) => b.text.length - a.text.length);

        for (const clause of hateSpeechClauses) {
            const clauseText = clause.text.trim();
            const regex = new RegExp(this.escapeRegExp(clauseText), 'gi');
            
            highlightedHTML = highlightedHTML.replace(regex, (match) => {
                return `<span class="hate-speech-highlight" 
                              title="Hate speech detected (Confidence: ${(clause.confidence * 100).toFixed(1)}%)&#10;${clause.justification}"
                              data-confidence="${clause.confidence}">
                          ${match}
                        </span>`;
            });
        }

        // Only update if we found matches
        if (highlightedHTML !== originalText) {
            element.innerHTML = highlightedHTML;
            element.classList.add('hate-speech-scanned');
        }
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    removeHighlights() {
        // Remove all existing highlights
        const highlights = document.querySelectorAll('.hate-speech-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });

        // Remove the scanned class
        const scannedElements = document.querySelectorAll('.hate-speech-scanned');
        scannedElements.forEach(element => {
            element.classList.remove('hate-speech-scanned');
        });
    }

    toggleDetection() {
        this.isEnabled = !this.isEnabled;
        chrome.storage.sync.set({ isEnabled: this.isEnabled });
        
        if (this.isEnabled) {
            this.scanPage();
        } else {
            this.removeHighlights();
        }
    }
}

// Initialize the detector when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.hateSpeechDetector = new HateSpeechDetector();
    });
} else {
    window.hateSpeechDetector = new HateSpeechDetector();
}

// Re-scan when new content is added dynamically
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            // Debounce the scanning to avoid excessive API calls
            clearTimeout(window.hateSpeechScanTimeout);
            window.hateSpeechScanTimeout = setTimeout(() => {
                if (window.hateSpeechDetector && window.hateSpeechDetector.isEnabled) {
                    window.hateSpeechDetector.scanPage();
                }
            }, 1000);
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
