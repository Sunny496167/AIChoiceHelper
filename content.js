// content.js
// This script is injected into webpages
// It handles text selection events, custom selection styling, and coding assistant features

// ============================================================================
// EXISTING FUNCTIONALITY - Selection Styling
// ============================================================================

// Inject custom CSS for selection color
(function () {
  const style = document.createElement('style');
  style.textContent = `
    ::selection {
      background-color: #dcdcdc2a !important;
    }
    
    ::-moz-selection {
      background-color: #dcdcdc2a !important;
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================================
// EXISTING FUNCTIONALITY - Text Selection Detection
// ============================================================================

// Listen for mouseup events to detect text selection
document.addEventListener('mouseup', function (event) {
  // Check if selection exists and is not empty
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText && isLikelyMultipleChoice(selectedText)) {
    // Notify background script to process the selection
    chrome.runtime.sendMessage({
      action: 'processSelection',
      text: selectedText
    });
  }
});

// Helper function to detect if text is likely a multiple choice question
function isLikelyMultipleChoice(text) {
  // Look for patterns like "1. Option" or "a) Option" or "A. Option"
  const mcPatterns = [
    /[a-d][\\.\\)]\\s+\\w+/i,  // a. Option or a) Option
    /[1-4][\\.\\)]\\s+\\w+/i,  // 1. Option or 1) Option
    /option\\s+[a-d]:/i,    // Option A:
    /\\b(multiple choice|choose one|select one)\\b/i  // Keywords
  ];

  // Check if the text contains at least one of the patterns
  return mcPatterns.some(pattern => pattern.test(text));
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('Content script received message:', request);

  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection().toString();
    console.log('Sending selected text:', selectedText);
    sendResponse({ text: selectedText });
    return true;
  }
});

// ============================================================================
// NEW FEATURE - AI CODING ASSISTANT
// ============================================================================

// Platform detection configuration
const SUPPORTED_PLATFORMS = {
  LEETCODE: {
    urlPattern: /leetcode\.com\/problems\/.+/,
    name: 'LeetCode',
    selectors: [
      'div[class*="elfjS"]',  // Common problem container
      'div[class*="content__"]',
      '.elfjS',
      '.question-content',
      '[data-track-load="description_content"]'
    ]
  },
  GEEKSFORGEEKS: {
    urlPattern: /geeksforgeeks\.org\/problems\/.+/,
    name: 'GeeksforGeeks',
    selectors: [
      '.problems_problem_content__Xk_eO',
      '.problem-statement',
      'div[class*="problem_content"]',
      '.problemStatement'
    ]
  }
};

// State management
let currentPlatform = null;
let sidebarInjected = false;
let buttonInjected = false;
let sidebarVisible = false;

// Initialize coding assistant if on supported platform
function initializeCodingAssistant() {
  const currentUrl = window.location.href;

  // Check if we're on a supported platform
  for (const [key, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
    if (platform.urlPattern.test(currentUrl)) {
      currentPlatform = platform;
      console.log(`[AI Coding Assistant] Detected platform: ${platform.name}`);
      injectFloatingButton();
      injectSidebarStyles();
      break;
    }
  }
}

// ============================================================================
// FLOATING ACTION BUTTON
// ============================================================================

function injectFloatingButton() {
  if (buttonInjected) return;

  const button = document.createElement('button');
  button.id = 'ai-coding-assistant-button';
  button.innerHTML = '🤖 Explain Problem';
  button.className = 'ai-coding-fab';

  button.addEventListener('click', toggleSidebar);

  document.body.appendChild(button);
  buttonInjected = true;
  console.log('[AI Coding Assistant] Floating button injected');
}

// ============================================================================
// SIDEBAR UI
// ============================================================================

function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'ai-coding-assistant-sidebar';
  sidebar.className = 'ai-coding-sidebar';

  sidebar.innerHTML = `
    <div class="ai-coding-sidebar-header">
      <h3>🤖 AI Coding Assistant</h3>
      <button class="ai-coding-close-btn" id="ai-coding-close">✖</button>
    </div>
    
    <div class="ai-coding-sidebar-content">
      <div class="ai-coding-controls">
        <label for="ai-coding-language">Select Output:</label>
        <select id="ai-coding-language" class="ai-coding-select">
          <option value="explain">Explain Only</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        
        <button id="ai-coding-generate" class="ai-coding-generate-btn">
          <span class="ai-coding-btn-text">Generate</span>
          <span class="ai-coding-btn-loader" style="display: none;">⏳ Loading...</span>
        </button>
      </div>
      
      <div class="ai-coding-output" id="ai-coding-output">
        <div class="ai-coding-placeholder">
          <p>👋 Welcome to AI Coding Assistant!</p>
          <p>Select your preferred output format and click <strong>Generate</strong> to get:</p>
          <ul>
            <li>Problem understanding</li>
            <li>Optimal approach</li>
            <li>Key concepts</li>
            <li>Time & space complexity</li>
            <li>Step-by-step explanation</li>
            <li>Clean code (if language selected)</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);
  sidebarInjected = true;

  // Attach event listeners
  document.getElementById('ai-coding-close').addEventListener('click', toggleSidebar);
  document.getElementById('ai-coding-generate').addEventListener('click', handleGenerate);

  console.log('[AI Coding Assistant] Sidebar injected');
}

function toggleSidebar() {
  if (!sidebarInjected) {
    createSidebar();
  }

  const sidebar = document.getElementById('ai-coding-assistant-sidebar');
  sidebarVisible = !sidebarVisible;

  if (sidebarVisible) {
    sidebar.classList.add('visible');
  } else {
    sidebar.classList.remove('visible');
  }
}

// ============================================================================
// PROBLEM EXTRACTION
// ============================================================================

function extractProblemText() {
  if (!currentPlatform) {
    console.error('[AI Coding Assistant] No platform detected');
    return null;
  }

  let problemText = '';

  // Try each selector until we find content
  for (const selector of currentPlatform.selectors) {
    try {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) {
        problemText = element.innerText.trim();
        console.log(`[AI Coding Assistant] Problem extracted using selector: ${selector}`);
        break;
      }
    } catch (error) {
      console.warn(`[AI Coding Assistant] Selector failed: ${selector}`, error);
    }
  }

  // Fallback: try to find any large text block
  if (!problemText) {
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
      const text = div.innerText?.trim() || '';
      if (text.length > 200 && text.toLowerCase().includes('example')) {
        problemText = text;
        console.log('[AI Coding Assistant] Problem extracted using fallback method');
        break;
      }
    }
  }

  if (!problemText) {
    console.error('[AI Coding Assistant] Failed to extract problem text');
    return null;
  }

  // Limit length to avoid token limits
  if (problemText.length > 3000) {
    problemText = problemText.substring(0, 3000) + '...';
  }

  return problemText;
}

// ============================================================================
// GENERATE HANDLER
// ============================================================================

function handleGenerate() {
  const languageSelect = document.getElementById('ai-coding-language');
  const generateBtn = document.getElementById('ai-coding-generate');
  const outputDiv = document.getElementById('ai-coding-output');
  const btnText = generateBtn.querySelector('.ai-coding-btn-text');
  const btnLoader = generateBtn.querySelector('.ai-coding-btn-loader');

  const selectedLanguage = languageSelect.value;

  // Extract problem text
  const problemText = extractProblemText();

  if (!problemText) {
    showError('Failed to extract problem text. Please make sure you are on a problem page.');
    return;
  }

  // Show loading state
  btnText.style.display = 'none';
  btnLoader.style.display = 'inline';
  generateBtn.disabled = true;
  outputDiv.innerHTML = '<div class="ai-coding-loading">⏳ Generating solution...</div>';

  // Send to background script
  chrome.runtime.sendMessage({
    action: 'solveCodingProblem',
    problemText: problemText,
    language: selectedLanguage,
    platform: currentPlatform.name
  }, (response) => {
    // Reset button state
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
    generateBtn.disabled = false;

    if (chrome.runtime.lastError) {
      showError('Communication error: ' + chrome.runtime.lastError.message);
      return;
    }

    if (response && response.success) {
      renderResponse(response.result, selectedLanguage);
    } else {
      showError(response?.error || 'An unexpected error occurred');
    }
  });
}

// ============================================================================
// RESPONSE RENDERING
// ============================================================================

function renderResponse(responseText, language) {
  const outputDiv = document.getElementById('ai-coding-output');

  // Parse and format the response
  let formattedHTML = '';

  // Check if response contains code blocks (using ``` markdown syntax)
  if (responseText.includes('```')) {
    formattedHTML = formatMarkdownResponse(responseText, language);
  } else {
    // Simple text formatting
    formattedHTML = `<div class="ai-coding-text">${escapeHtml(responseText).replace(/\\n/g, '<br>')}</div>`;
  }

  outputDiv.innerHTML = formattedHTML;

  // Add copy buttons to code blocks
  addCopyButtons();
}

function formatMarkdownResponse(text, language) {
  let html = '';
  const parts = text.split('```');

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Regular text - use enhanced markdown parser
      html += parseMarkdownText(parts[i]);
    } else {
      // Code block
      const lines = parts[i].split('\n');
      const lang = lines[0].trim() || language || 'text';
      const code = lines.slice(1).join('\n').trim();

      html += `
        <div class="ai-coding-code-block">
          <div class="ai-coding-code-header">
            <span class="ai-coding-code-lang">${lang}</span>
            <button class="ai-coding-copy-btn" data-code="${escapeHtml(code).replace(/"/g, '&quot;')}">
              📋 Copy
            </button>
          </div>
          <pre><code>${escapeHtml(code)}</code></pre>
        </div>
      `;
    }
  }

  return html;
}

/**
 * Parse markdown text into HTML with proper formatting
 */
function parseMarkdownText(text) {
  if (!text || !text.trim()) return '';

  let html = '<div class="ai-coding-text">';
  const lines = text.split('\n');
  let inList = false;
  let inParagraph = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip empty lines but close any open elements
    if (!line.trim()) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      continue;
    }

    // Headers (## or ###)
    if (line.match(/^#{1,6}\s+/)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }

      const level = line.match(/^#{1,6}/)[0].length;
      const headerText = line.replace(/^#{1,6}\s+/, '').trim();
      const className = level <= 2 ? 'ai-coding-header-main' : 'ai-coding-header-sub';
      html += `<h${Math.min(level + 2, 6)} class="${className}">${formatInlineMarkdown(headerText)}</h${Math.min(level + 2, 6)}>`;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      html += '<hr class="ai-coding-divider">';
      continue;
    }

    // Unordered list (*, -, or numbered list 1., 2., etc.)
    if (line.match(/^[\s]*[\*\-\+]\s+/) || line.match(/^[\s]*\d+\.\s+/)) {
      if (inParagraph) {
        html += '</p>';
        inParagraph = false;
      }
      if (!inList) {
        html += '<ul class="ai-coding-list">';
        inList = true;
      }

      const listText = line.replace(/^[\s]*[\*\-\+\d\.]\s+/, '').trim();
      html += `<li>${formatInlineMarkdown(listText)}</li>`;
      continue;
    }

    // Regular paragraph
    if (inList) {
      html += '</ul>';
      inList = false;
    }

    if (!inParagraph) {
      html += '<p>';
      inParagraph = true;
    } else {
      html += ' ';
    }

    html += formatInlineMarkdown(line);
  }

  // Close any open elements
  if (inList) html += '</ul>';
  if (inParagraph) html += '</p>';

  html += '</div>';
  return html;
}

/**
 * Format inline markdown (bold, italic, inline code)
 */
function formatInlineMarkdown(text) {
  text = escapeHtml(text);

  // Bold (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');

  // Inline code (`code`)
  text = text.replace(/`(.+?)`/g, '<code class="ai-coding-inline-code">$1</code>');

  return text;
}


function addCopyButtons() {
  const copyButtons = document.querySelectorAll('.ai-coding-copy-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code');
      const decodedCode = decodeHtml(code);

      navigator.clipboard.writeText(decodedCode).then(() => {
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
          btn.textContent = '📋 Copy';
        }, 2000);
      }).catch(err => {
        console.error('Failed to copy:', err);
        btn.textContent = '✗ Failed';
      });
    });
  });
}

function showError(message) {
  const outputDiv = document.getElementById('ai-coding-output');
  outputDiv.innerHTML = `
    <div class="ai-coding-error">
      <p><strong>⚠️ Error:</strong></p>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function decodeHtml(html) {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

// ============================================================================
// STYLES INJECTION
// ============================================================================

function injectSidebarStyles() {
  const style = document.createElement('style');
  style.id = 'ai-coding-assistant-styles';
  style.textContent = `
    /* Floating Action Button */
    .ai-coding-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 30px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      z-index: 999999;
      transition: all 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .ai-coding-fab:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
    }
    
    .ai-coding-fab:active {
      transform: translateY(0);
    }
    
    /* Sidebar */
    .ai-coding-sidebar {
      position: fixed;
      top: 0;
      right: -420px;
      width: 420px;
      height: 100vh;
      background: #ffffff;
      box-shadow: -2px 0 20px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .ai-coding-sidebar.visible {
      right: 0;
    }
    
    /* Header */
    .ai-coding-sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .ai-coding-sidebar-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .ai-coding-close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 20px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    
    .ai-coding-close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    /* Content */
    .ai-coding-sidebar-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    /* Controls */
    .ai-coding-controls {
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .ai-coding-controls label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #374151;
    }
    
    .ai-coding-select {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    
    .ai-coding-select:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .ai-coding-generate-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .ai-coding-generate-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .ai-coding-generate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    /* Output */
    .ai-coding-output {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f9fafb;
    }
    
    .ai-coding-placeholder {
      color: #6b7280;
      line-height: 1.6;
    }
    
    .ai-coding-placeholder p {
      margin: 0 0 12px 0;
    }
    
    .ai-coding-placeholder ul {
      margin: 12px 0;
      padding-left: 24px;
    }
    
    .ai-coding-placeholder li {
      margin: 6px 0;
    }
    
    .ai-coding-loading {
      text-align: center;
      padding: 40px 20px;
      font-size: 16px;
      color: #667eea;
    }
    
    .ai-coding-text {
      background: white;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      line-height: 1.6;
      color: #374151;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .ai-coding-text p {
      margin: 0 0 12px 0;
    }
    
    .ai-coding-text p:last-child {
      margin-bottom: 0;
    }
    
    /* Markdown Headers */
    .ai-coding-header-main {
      color: #1f2937;
      font-weight: bold;
      font-size: 18px;
      margin: 16px 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .ai-coding-header-sub {
      color: #374151;
      font-weight: 600;
      font-size: 16px;
      margin: 14px 0 10px 0;
    }
    
    /* Lists */
    .ai-coding-list {
      margin: 12px 0;
      padding-left: 24px;
      line-height: 1.8;
    }
    
    .ai-coding-list li {
      margin: 6px 0;
    }
    
    /* Horizontal Rule */
    .ai-coding-divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 16px 0;
    }
    
    /* Inline Code */
    .ai-coding-inline-code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Consolas, Monaco, monospace;
      font-size: 0.9em;
      color: #dc2626;
    }
    
    /* Bold and Italic */
    .ai-coding-text strong {
      font-weight: 600;
      color: #1f2937;
    }
    
    .ai-coding-text em {
      font-style: italic;
      color: #4b5563;
    }
    
    .ai-coding-code-block {
      background: white;
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .ai-coding-code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #f3f4f6;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .ai-coding-code-lang {
      font-size: 12px;
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
    }
    
    .ai-coding-copy-btn {
      padding: 4px 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .ai-coding-copy-btn:hover {
      background: #5568d3;
    }
    
    .ai-coding-code-block pre {
      margin: 0;
      padding: 16px;
      overflow-x: auto;
      background: #1e1e1e;
    }
    
    .ai-coding-code-block code {
      font-family: 'Courier New', Consolas, Monaco, monospace;
      font-size: 13px;
      line-height: 1.5;
      color: #d4d4d4;
    }
    
    .ai-coding-error {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      padding: 16px;
      color: #dc2626;
    }
    
    .ai-coding-error p {
      margin: 0 0 8px 0;
    }
    
    .ai-coding-error p:last-child {
      margin-bottom: 0;
    }
    
    /* Scrollbar */
    .ai-coding-output::-webkit-scrollbar {
      width: 8px;
    }
    
    .ai-coding-output::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    .ai-coding-output::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }
    
    .ai-coding-output::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
  `;

  document.head.appendChild(style);
  console.log('[AI Coding Assistant] Styles injected');
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCodingAssistant);
} else {
  initializeCodingAssistant();
}

// Also check on URL changes (for SPAs)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Reset state
    currentPlatform = null;
    buttonInjected = false;
    sidebarInjected = false;
    sidebarVisible = false;
    // Re-initialize
    initializeCodingAssistant();
  }
}).observe(document.body, { childList: true, subtree: true });