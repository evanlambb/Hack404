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
                              data-confidence="${clause.confidence}"
                              data-original-text="${this.escapeHtml(match)}"
                              data-tooltip="Hate speech detected (Confidence: ${(clause.confidence * 100).toFixed(1)}%)&#10;${clause.justification}&#10;&#10;Click the X to remove this content">
                          ${match}
                        </span>`;
            });
        }

        // Only update if we found matches
        if (highlightedHTML !== originalText) {
            element.innerHTML = highlightedHTML;
            element.classList.add('hate-speech-scanned');
            
            // Add hover event listeners to all highlighted elements in this container
            this.addHoverListeners(element);
        }
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addHoverListeners(container) {
        const highlights = container.querySelectorAll('.hate-speech-highlight');
        highlights.forEach(highlight => {
            highlight.addEventListener('mouseenter', (e) => {
                // Clear any existing hide timeout
                clearTimeout(highlight._hideTimeout);
                this.showTooltipAndXButton(highlight);
            });
            
            highlight.addEventListener('mouseleave', (e) => {
                // Add a delay before hiding to allow moving to X button or tooltip
                highlight._hideTimeout = setTimeout(() => {
                    this.hideTooltipAndXButton(highlight);
                }, 200);
            });
        });
    }

    showTooltipAndXButton(highlightElement) {
        // Remove any existing tooltip and X button
        this.hideTooltipAndXButton(highlightElement);

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'hate-speech-tooltip';
        tooltip.innerHTML = highlightElement.getAttribute('data-tooltip');
        
        // Add mouse events to tooltip to keep it visible
        tooltip.addEventListener('mouseenter', () => {
            clearTimeout(highlightElement._hideTimeout);
        });
        tooltip.addEventListener('mouseleave', () => {
            this.hideTooltipAndXButton(highlightElement);
        });
        
        document.body.appendChild(tooltip);

        // Create X button
        const xButton = document.createElement('div');
        xButton.className = 'hate-speech-x-button';
        xButton.innerHTML = '✕';
        
        // Add mouse events to X button
        xButton.addEventListener('mouseenter', () => {
            clearTimeout(highlightElement._hideTimeout);
        });
        xButton.addEventListener('mouseleave', () => {
            this.hideTooltipAndXButton(highlightElement);
        });
        xButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.removeHateSpeechElement(highlightElement);
        });
        
        document.body.appendChild(xButton);

        // Position tooltip and X button
        this.positionTooltipAndXButton(highlightElement, tooltip, xButton);

        // Store references for cleanup
        highlightElement._tooltip = tooltip;
        highlightElement._xButton = xButton;
    }

    hideTooltipAndXButton(highlightElement) {
        // Clear any pending hide timeout
        clearTimeout(highlightElement._hideTimeout);
        
        if (highlightElement._tooltip) {
            highlightElement._tooltip.remove();
            highlightElement._tooltip = null;
        }
        if (highlightElement._xButton) {
            highlightElement._xButton.remove();
            highlightElement._xButton = null;
        }
    }

    positionTooltipAndXButton(highlightElement, tooltip, xButton) {
        const rect = highlightElement.getBoundingClientRect();
        
        // Position tooltip above the element
        tooltip.style.position = 'fixed';
        tooltip.style.bottom = (window.innerHeight - rect.top + 5) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.transform = 'translateX(-50%)';

        // Position X button at top-right corner
        xButton.style.position = 'fixed';
        xButton.style.top = (rect.top - 10) + 'px';
        xButton.style.left = (rect.right - 10) + 'px';
    }

    removeHateSpeechElement(highlightElement) {
        // Clean up tooltip and X button
        this.hideTooltipAndXButton(highlightElement);
        
        // Add some debugging
        console.log('Starting shatter effect for element:', highlightElement);
        
        // Apply glass shatter effect
        this.applyShatterEffect(highlightElement);
    }

    applyShatterEffect(element) {
        // Get element dimensions and position for particle effect
        const rect = element.getBoundingClientRect();
        
        // Create particle explosion at the current position
        this.createParticleExplosion(rect);
        
        // Immediately remove the element to allow text reflow
        const parent = element.parentNode;
        parent.removeChild(element);
        parent.normalize(); // Merge adjacent text nodes
        
        // Clean up particles after animation
        setTimeout(() => {
            this.cleanupParticleEffect();
        }, 1200);
    }

    createParticleExplosion(rect) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create red outer particles (faster) - increased count
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle red-particle';
            particle.style.position = 'fixed';
            particle.style.top = centerY + 'px';
            particle.style.left = centerX + 'px';
            
            // Calculate random direction
            const angle = (i / 25) * 360 + (Math.random() - 0.5) * 30;
            const distance = 120 + Math.random() * 80;
            const endX = Math.cos(angle * Math.PI / 180) * distance;
            const endY = Math.sin(angle * Math.PI / 180) * distance;
            
            particle.style.setProperty('--end-x', endX + 'px');
            particle.style.setProperty('--end-y', endY + 'px');
            particle.style.animationDelay = (Math.random() * 0.1) + 's';
            
            document.body.appendChild(particle);
        }
        
        // Create light red inner particles (slower) - increased count
        for (let i = 0; i < 18; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle light-red-particle';
            particle.style.position = 'fixed';
            particle.style.top = centerY + 'px';
            particle.style.left = centerX + 'px';
            
            // Calculate random direction with shorter distance
            const angle = (i / 18) * 360 + (Math.random() - 0.5) * 45;
            const distance = 60 + Math.random() * 40;
            const endX = Math.cos(angle * Math.PI / 180) * distance;
            const endY = Math.sin(angle * Math.PI / 180) * distance;
            
            particle.style.setProperty('--end-x', endX + 'px');
            particle.style.setProperty('--end-y', endY + 'px');
            particle.style.animationDelay = (Math.random() * 0.15) + 's';
            
            document.body.appendChild(particle);
        }
    }

    cleanupParticleEffect() {
        // Remove all particles
        document.querySelectorAll('.explosion-particle').forEach(particle => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
    }

    // ...existing code...

    removeHighlights() {
        // Remove all existing highlights and their associated elements
        const highlights = document.querySelectorAll('.hate-speech-highlight');
        highlights.forEach(highlight => {
            // Clean up tooltip and X button if they exist
            this.hideTooltipAndXButton(highlight);
            
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });

        // Remove the scanned class
        const scannedElements = document.querySelectorAll('.hate-speech-scanned');
        scannedElements.forEach(element => {
            element.classList.remove('hate-speech-scanned');
        });

        // Clean up any orphaned tooltip or X button elements
        document.querySelectorAll('.hate-speech-tooltip, .hate-speech-x-button').forEach(el => el.remove());
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
