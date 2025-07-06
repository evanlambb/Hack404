// Popup script for the Chrome extension
document.addEventListener('DOMContentLoaded', async () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const autoRemoveToggle = document.getElementById('autoRemoveToggle');
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const rescanBtn = document.getElementById('rescanBtn');

    // Load current settings
    const result = await chrome.storage.sync.get(['isEnabled', 'confidenceThreshold', 'autoRemove']);
    const isEnabled = result.isEnabled !== false; // Default to true
    const confidenceThreshold = result.confidenceThreshold || 0.6;
    const autoRemove = result.autoRemove !== false; // Default to true

    // Update UI with current settings
    updateToggleSwitch(isEnabled);
    updateAutoRemoveToggle(autoRemove);
    thresholdSlider.value = confidenceThreshold;
    updateThresholdDisplay(confidenceThreshold);
    updateStatus(isEnabled);

    // Toggle switch event
    toggleSwitch.addEventListener('click', async () => {
        const newState = !toggleSwitch.classList.contains('active');
        updateToggleSwitch(newState);
        await chrome.storage.sync.set({ isEnabled: newState });
        updateStatus(newState);
        
        // Send message to content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
        } catch (error) {
            console.error('Error sending message to content script:', error);
        }
    });

    // Auto-remove toggle event
    autoRemoveToggle.addEventListener('click', async () => {
        const newState = !autoRemoveToggle.classList.contains('active');
        updateAutoRemoveToggle(newState);
        await chrome.storage.sync.set({ autoRemove: newState });
        
        // Send message to content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { 
                action: 'updateAutoRemove', 
                autoRemove: newState 
            });
        } catch (error) {
            console.error('Error sending message to content script:', error);
        }
    });

    // Threshold slider event
    thresholdSlider.addEventListener('input', async (e) => {
        const threshold = parseFloat(e.target.value);
        updateThresholdDisplay(threshold);
        await chrome.storage.sync.set({ confidenceThreshold: threshold });
        
        // Send message to content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { 
                action: 'updateThreshold', 
                threshold: threshold 
            });
        } catch (error) {
            console.error('Error sending message to content script:', error);
        }
    });

    // Rescan button event
    rescanBtn.addEventListener('click', async () => {
        rescanBtn.disabled = true;
        rescanBtn.textContent = 'Rescanning...';
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
            
            // Wait a moment then toggle back on if it was enabled
            setTimeout(async () => {
                if (toggleSwitch.classList.contains('active')) {
                    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
                }
                rescanBtn.disabled = false;
                rescanBtn.textContent = 'Rescan Page';
            }, 500);
        } catch (error) {
            console.error('Error rescanning page:', error);
            rescanBtn.disabled = false;
            rescanBtn.textContent = 'Rescan Page';
        }
    });

    function updateToggleSwitch(enabled) {
        if (enabled) {
            toggleSwitch.classList.add('active');
        } else {
            toggleSwitch.classList.remove('active');
        }
    }

    function updateAutoRemoveToggle(enabled) {
        if (enabled) {
            autoRemoveToggle.classList.add('active');
        } else {
            autoRemoveToggle.classList.remove('active');
        }
    }

    function updateThresholdDisplay(threshold) {
        thresholdValue.textContent = `${Math.round(threshold * 100)}%`;
    }

    function updateStatus(enabled) {
        if (enabled) {
            statusIndicator.classList.remove('inactive');
            statusIndicator.classList.add('active');
            statusText.textContent = 'Filtering Active';
        } else {
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
            statusText.textContent = 'Filtering Disabled';
        }
    }

    // Check if the API is accessible
    try {
        const response = await fetch('http://localhost:8000/', { method: 'GET' });
        if (response.ok) {
            // API is accessible
            console.log('HateZero API is accessible');
        } else {
            statusText.textContent = 'API Connection Issue';
        }
    } catch (error) {
        statusText.textContent = 'API Offline';
        console.error('Cannot connect to HateZero API:', error);
    }
});
