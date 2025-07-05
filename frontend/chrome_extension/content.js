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
        // Add shattering class to the element
        element.classList.add('hate-speech-shattering');
        
        // Get element dimensions and position
        const rect = element.getBoundingClientRect();
        const originalText = element.textContent;
        const computedStyle = window.getComputedStyle(element);
        
        // Make element invisible but keep it in place for positioning reference
        element.style.visibility = 'hidden';
        
        // Create fragments with a slight delay to ensure the crack animation shows first
        setTimeout(() => {
            this.createShatterFragments(element, rect, originalText, computedStyle);
            this.createDebrisParticles(rect);
        }, 100);
        
        // Clean up and replace with censored text after animation
        setTimeout(() => {
            this.cleanupShatterEffect();
            
            // Replace with censored text
            const censoredSpan = document.createElement('span');
            censoredSpan.className = 'hate-speech-censored';
            censoredSpan.textContent = '[Content Removed]';
            censoredSpan.title = 'This content was removed by the Hate Speech Detector';
            
            element.parentNode.replaceChild(censoredSpan, element);
            element.parentNode.normalize();
        }, 1200);
    }

    createShatterFragments(element, rect, originalText, computedStyle) {
        const fragmentCount = 8;
        const fragments = [];
        
        for (let i = 0; i < fragmentCount; i++) {
            const fragment = document.createElement('span');
            fragment.className = 'shatter-fragment';
            fragment.textContent = originalText;
            fragment.setAttribute('data-fragment-index', (i + 1).toString());
            
            // Copy essential styles
            fragment.style.position = 'fixed';
            fragment.style.top = rect.top + 'px';
            fragment.style.left = rect.left + 'px';
            fragment.style.width = rect.width + 'px';
            fragment.style.height = rect.height + 'px';
            fragment.style.fontSize = computedStyle.fontSize;
            fragment.style.fontFamily = computedStyle.fontFamily;
            fragment.style.fontWeight = computedStyle.fontWeight;
            fragment.style.lineHeight = computedStyle.lineHeight;
            fragment.style.padding = computedStyle.padding;
            fragment.style.margin = '0';
            fragment.style.border = computedStyle.border;
            fragment.style.borderRadius = computedStyle.borderRadius;
            fragment.style.backgroundColor = computedStyle.backgroundColor;
            fragment.style.color = computedStyle.color;
            
            // Create different clipping regions for each fragment
            const col = i % 4;
            const row = Math.floor(i / 4);
            const clipX1 = col * 25;
            const clipY1 = row * 50;
            const clipX2 = clipX1 + 25;
            const clipY2 = clipY1 + 50;
            
            fragment.style.clipPath = `polygon(${clipX1}% ${clipY1}%, ${clipX2}% ${clipY1}%, ${clipX2}% ${clipY2}%, ${clipX1}% ${clipY2}%)`;
            
            document.body.appendChild(fragment);
            fragments.push(fragment);
            
            console.log(`Created fragment ${i + 1}:`, fragment);
        }
        
        // Store fragments for cleanup
        window.shatterFragments = fragments;
    }

    createDebrisParticles(rect) {
        // Create debris particles that explode outward
        const debrisCount = 12;
        const debrisList = [];
        
        for (let i = 0; i < debrisCount; i++) {
            const debris = document.createElement('div');
            debris.className = 'shatter-debris';
            debris.style.position = 'fixed';
            debris.style.top = (rect.top + rect.height / 2) + 'px';
            debris.style.left = (rect.left + rect.width / 2) + 'px';
            debris.style.width = '4px';
            debris.style.height = '4px';
            debris.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            debris.style.borderRadius = '50%';
            debris.style.zIndex = '10000';
            debris.style.pointerEvents = 'none';
            
            // Use different debris animations in a cycle
            const animationIndex = (i % 6) + 1;
            debris.style.animation = `debris-scatter-${animationIndex} 0.8s ease-out forwards`;
            debris.style.animationDelay = '0s'; // All start immediately
            
            document.body.appendChild(debris);
            debrisList.push(debris);
        }
        
        // Store debris for cleanup
        window.shatterDebris = debrisList;
    }

    cleanupShatterEffect() {
        // Remove all fragments
        if (window.shatterFragments) {
            window.shatterFragments.forEach(fragment => {
                if (fragment.parentNode) {
                    fragment.parentNode.removeChild(fragment);
                }
            });
            window.shatterFragments = null;
        }
        
        // Remove all debris
        if (window.shatterDebris) {
            window.shatterDebris.forEach(debris => {
                if (debris.parentNode) {
                    debris.parentNode.removeChild(debris);
                }
            });
            window.shatterDebris = null;
        }
        
        // Clean up any orphaned shatter elements
        document.querySelectorAll('.shatter-fragment, .shatter-debris').forEach(el => {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    }

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
