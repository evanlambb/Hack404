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
        this.removeHighlights();

        if (!this.isEnabled) return;

        // Find all paragraph elements
        const paragraphs = document.querySelectorAll('p');
        
        for (const paragraph of paragraphs) {
            const text = paragraph.textContent.trim();
            if (text.length > 10) { // Only analyze paragraphs with meaningful content
                await this.analyzeParagraph(paragraph, text);
            }
        }
    }

    async analyzeParagraph(paragraph, text) {
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
                this.highlightHateSpeech(paragraph, result.hate_speech_clauses);
            }
        } catch (error) {
            console.error('Error analyzing text:', error);
        }
    }

    highlightHateSpeech(paragraph, hateSpeechClauses) {
        let originalText = paragraph.textContent;
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
            paragraph.innerHTML = highlightedHTML;
            paragraph.classList.add('hate-speech-scanned');
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
