# HateZero Chrome Extension

This Chrome extension automatically removes hate speech from web pages using AI, creating a cleaner browsing experience.

## Features

- **Real-time Detection**: Automatically scans paragraph elements on web pages
- **Auto-Remove Mode**: Automatically removes detected hate speech content
- **Manual Mode**: Highlights hate speech for manual review and removal
- **Confidence Levels**: Adjustable sensitivity threshold (10% - 90%)
- **Detailed Tooltips**: In manual mode, hover over highlighted text to see confidence scores and AI justification
- **Toggle Controls**: Easy on/off switches for detection and auto-remove
- **Dynamic Content**: Automatically scans new content added to pages
- **Particle Effects**: Visual feedback when content is removed

## Installation

1. **Start the Backend API**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python hate_speech_api.py
   ```
   The API will run on `http://localhost:8000`

2. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `frontend/chrome_extension` folder

3. **Add Icons** (Optional):
   - Create PNG icons named `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
   - Place them in the chrome_extension folder
   - Or remove the icons section from `manifest.json`

## Usage

1. **Enable Detection**: Click the extension icon and toggle "Detection" ON
2. **Choose Mode**: Toggle "Auto-Remove" ON for automatic removal, or OFF for manual review
3. **Adjust Sensitivity**: Use the slider to set confidence threshold (default: 60%)
4. **Auto Mode**: Hate speech is automatically removed with particle effects
5. **Manual Mode**: Hate speech is highlighted in red - hover for details, click to remove
6. **Rescan Page**: Click "Rescan Page" to re-analyze after content changes

## How It Works

1. The extension scans all paragraph (`<p>`) elements on the page
2. Text content is sent to the local AI detection API
3. The AI model analyzes text for hate speech patterns
4. **Auto-Remove Mode**: Detected content is automatically removed with visual effects
5. **Manual Mode**: Detected content is highlighted for user review and manual removal

## API Endpoints Used

- `POST /analyze-simple`: Main endpoint for hate speech detection
- `GET /`: Health check for API connectivity

## Settings

Settings are automatically saved and persist across browser sessions:
- **Detection Status**: On/Off toggle for the extension
- **Auto-Remove Mode**: Automatically remove vs manual review
- **Confidence Threshold**: Sensitivity level (0.1 - 0.9)

## Privacy

- All text analysis happens locally through your own API instance
- No data is sent to external servers
- The extension only processes text content from paragraph elements

## Troubleshooting

- **"API Offline"**: Make sure the backend server is running on localhost:8000
- **No Detection**: Check that the confidence threshold isn't set too high
- **Performance Issues**: The extension processes text in real-time; very long pages may experience delays

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: activeTab, storage
- **Content Security**: Only communicates with localhost:8000
- **Dynamic Content**: Uses MutationObserver to detect page changes
