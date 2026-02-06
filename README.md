# AI Choice Helper 🤖✨

A powerful Chrome extension that provides AI-powered answers for various question types with customizable display settings, plus an integrated coding assistant for LeetCode and GeeksforGeeks.

## Features

### 🤖 AI Coding Assistant (NEW!)
- **Platform Support**: Works on LeetCode and GeeksforGeeks problem pages
- **Floating Button**: Click "🤖 Explain Problem" to open sidebar
- **Language Options**: 
  - Explain Only (no code)
  - C++, Java, Python, JavaScript (explanation + code)
- **Comprehensive Analysis**:
  - Problem understanding
  - Optimal approach & algorithms
  - Time & space complexity
  - Step-by-step logic
  - Clean, optimized code
- **One-Click Copy**: Copy code blocks with a single click

### 🎯 Multiple Question Types
- **MCQ (Multiple Choice)** - Get the best answer with explanation
- **Explain** - Clear concept explanations
- **Short Answer** - Concise responses (30 words)
- **Long Answer** - Detailed responses (70 words)
- **Word Meaning** - Definitions and explanations

### 🎨 Customizable Display
- **Opacity Control** - Adjust notification transparency (0.1 - 1.0)
- **Position Options** - Choose from 5 positions:
  - Center
  - Top-Left
  - Top-Right
  - Bottom-Left
  - Bottom-Right
- **Display Duration** - Set how long answers appear (1-10 seconds)

### 🤖 Multiple AI Providers
- OpenAI (ChatGPT)
- Google Gemini
- DeepSeek
- Perplexity

## Installation

1. **Download/Clone** this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the extension folder
6. The extension icon should appear in your toolbar

## Setup

1. Click the extension icon to open settings
2. Select your preferred AI provider
3. Enter your API key for the selected provider
4. (Optional) Customize display settings:
   - Choose notification position
   - Adjust opacity
   - Set display duration
5. Select default question type
6. Click **Save Settings**

## Usage

### For Regular Questions (MCQ, Explanations, etc.)

#### Method 1: Keyboard Shortcut
1. Select text on any webpage
2. Press `Ctrl + Shift + Q` (Windows/Linux) or `Cmd + E` (Mac)
3. AI answer appears as notification

#### Method 2: Context Menu
1. Select text on any webpage
2. Right-click the selection
3. Click "Get AI answer"
4. AI answer appears as notification

### For Coding Problems (LeetCode, GeeksforGeeks)

1. **Navigate** to a problem page on LeetCode or GeeksforGeeks
2. **Look** for the floating "🤖 Explain Problem" button at bottom-right
3. **Click** the button to open the sidebar
4. **Select** your preferred output (Explain Only, or a programming language)
5. **Click** "Generate" button
6. **Review** the AI-generated explanation and code
7. **Copy** code using the copy button above code blocks


## API Keys

You'll need an API key from at least one provider:

- **OpenAI**: Get key from [OpenRouter](https://openrouter.ai/)
- **Gemini**: Get key from [Google AI Studio](https://aistudio.google.com/)
- **DeepSeek**: Get key from [OpenRouter](https://openrouter.ai/)
- **Perplexity**: Get key from [Perplexity](https://www.perplexity.ai/)

## Settings Reference

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| **Opacity** | 0.1 - 1.0 | 0.9 | Notification transparency |
| **Position** | 5 options | Center | Where notification appears |
| **Duration** | 1 - 10 sec | 3 sec | How long notification stays |
| **Question Type** | 5 types | MCQ | Type of answer to generate |

## File Structure

```
AI-Choice-Helper/
├── manifest.json          # Extension configuration
├── popup.html            # Settings interface
├── popup.css             # UI styling
├── popup.js              # Settings management
├── background.js         # Core logic, API calls & coding assistant
├── content.js            # Page integration, text selection & coding UI
├── utils/                # Utility modules (for reference)
│   ├── constants.js
│   ├── storage.js
│   ├── errorHandler.js
│   ├── notificationHelper.js
│   └── apiHandler.js
└── image/                # Extension icons
```

**Note**: The coding assistant UI (floating button and sidebar) is dynamically injected by `content.js` only on supported coding platforms.

## Troubleshooting

### ❌ Notification not appearing
- ✅ Check if API key is set correctly
- ✅ Verify text is selected before triggering
- ✅ Check browser console for errors (F12)
- ✅ Ensure you're not on a restricted page (chrome://, edge://)

### ❌ Settings not saving
- ✅ Check if required API key is provided
- ✅ Reload the extension
- ✅ Check browser console for storage errors

### ❌ Wrong answer format
- ✅ Verify correct question type is selected
- ✅ Try a different AI provider
- ✅ Check if API has sufficient credits

## Privacy & Security

- ✅ **No data collection** - All data stays on your device
- ✅ **Secure storage** - API keys stored in Chrome's encrypted storage
- ✅ **Direct API calls** - No intermediary servers
- ✅ **Open source** - Code is fully auditable

## Technical Details

### Permissions
- `storage` - Save settings locally
- `contextMenus` - Add right-click menu option
- `activeTab` - Access current tab for text selection
- `scripting` - Inject notification display code

### Browser Compatibility
- ✅ Chrome (v88+)
- ✅ Edge (v88+)
- ✅ Brave
- ✅ Other Chromium-based browsers

## Development

### Built With
- Vanilla JavaScript (ES6+)
- Chrome Extensions Manifest V3
- Chrome Storage API
- Chrome Scripting API

### Code Organization
- Modular utility functions
- Centralized error handling
- Clean separation of concerns
- Comprehensive inline documentation

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

This project is open source and available for personal and educational use.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the [walkthrough documentation](./walkthrough.md)
3. Check browser console for error messages

## Changelog

### Version 1.0 (Current)
- ✨ Multiple question type support (MCQ, Explain, Short/Long Answer, Word Meaning)
- 🎨 Customizable notification opacity
- 📍 5 position options for notifications
- ⏱️ Adjustable display duration (1-10s)
- 🤖 Support for 4 AI providers (OpenAI, Gemini, DeepSeek, Perplexity)
- 🎯 Enhanced error handling
- 📁 Improved code organization with utility modules
- 💅 Modern UI with custom sliders and gradients

---

**Made with ❤️ for better learning and productivity**
