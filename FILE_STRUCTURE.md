# AI Choice Helper - File Structure

## Project Directory: `d:\Programs\CA4 - Copy`

```
CA4 - Copy/
├── manifest.json              # Extension manifest (permissions, metadata)
├── popup.html                 # Extension popup UI
├── popup.css                  # Popup styling  
├── popup.js                   # Popup logic and settings management
├── background.js              # Core extension logic and AI API calls
├── content.js                 # Content script (injected into web pages)
│
├── utils/                     # Utility modules (for organization)
│   ├── constants.js          # Centralized constants and configs
│   ├── storage.js            # Chrome storage utilities
│   ├── errorHandler.js       # Error handling and logging
│   ├── notificationHelper.js # Notification display utilities
│   └── apiHandler.js         # API request management
│
└── image/                     # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## File Purposes

### Core Files

| File | Purpose | Key Functions |
|------|---------|--------------|
| **manifest.json** | Extension configuration | Defines permissions, content scripts, background service worker |
| **popup.html** | Settings UI | API keys, display settings, question type selector |
| **popup.css** | UI styling | Custom sliders, gradients, modern design |
| **popup.js** | Settings management | Load/save settings, validation, real-time updates |
| **background.js** | Extension logic | AI API calls, notification display, event handling |
| **content.js** | Page integration | Text selection detection, custom selection styles |

### Utility Modules

> **Note:** These modules were created for better code organization but are currently not imported in the main files since Chrome extensions have specific module loading requirements. The logic from these files has been integrated directly into the main files.

| File | Purpose | Key Exports |
|------|---------|-------------|
| **constants.js** | Configuration | DEFAULT_SETTINGS, QUESTION_TYPE_CONFIG, ERROR_MESSAGES |
| **storage.js** | Storage ops | getSettings(), saveSettings(), validateSettings() |
| **errorHandler.js** | Error handling | APIError class, parseAPIError(), getUserFriendlyError() |
| **notificationHelper.js** | Notifications | getPositionStyles(), createNotificationElement() |
| **apiHandler.js** | API requests | buildAPIRequest(), callAI(), extractResponse() |

## Data Flow

```
User Action (text selection)
        ↓
content.js detects selection
        ↓
Message sent to background.js
        ↓
background.js retrieves settings from chrome.storage
        ↓
background.js builds API request based on questionType
        ↓
API call to selected provider (OpenAI/Gemini/DeepSeek/Perplexity)
        ↓
Response parsed and formatted
        ↓
Notification injected into page with custom position/opacity/duration
        ↓
Notification animates and auto-removes after displayDuration
```

## Settings Storage

Settings are stored in `chrome.storage.sync`:

```javascript
{
  // API Configuration
  apiProvider: "openai" | "gemini" | "deepseek" | "perplexity",
  openaiKey: "sk-...",
  geminiKey: "AIza...",
  deepseekKey: "sk-...",
  perplexityKey: "pplx-...",
  
  // Display Settings
  notificationPosition: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right",
  notificationOpacity: 0.1 to 1.0,
  displayDuration: 1 to 10,
  
  // Question Type
  questionType: "mcq" | "explain" | "short-answer" | "long-answer" | "word-meaning"
}
```

## Event Flow

### Keyboard Shortcut (Ctrl+Q)
```
User presses Ctrl+Q
    ↓
chrome.commands.onCommand listener in background.js
    ↓
executeScript to get selected text
    ↓
processSelectedText(text, tabId)
```

### Right-Click Context Menu
```
User right-clicks selected text
    ↓
Clicks "Get AI answer"
    ↓
chrome.contextMenus.onClicked listener in background.js
    ↓
processSelectedText(text, tabId)
```

### Automatic Detection (content.js)
```
User selects text with mouse
    ↓
mouseup event listener in content.js
    ↓
Check if text matches MCQ pattern
    ↓
Send message to background.js
    ↓
processSelectedText(text, tabId)
```

## Permissions Required

From manifest.json:
- **storage**: Save/load settings
- **contextMenus**: Right-click menu
- **activeTab**: Access current tab
- **scripting**: Inject notification scripts

## API Providers Supported

| Provider | Model | Endpoint | Auth Method |
|----------|-------|----------|-------------|
| OpenAI | chatgpt-4o-latest | OpenRouter | Bearer token |
| Gemini | gemini-2.5-flash | Google AI | Query param |
| DeepSeek | deepseek-r1:free | OpenRouter | Bearer token |
| Perplexity | sonar | Perplexity AI | Bearer token |
