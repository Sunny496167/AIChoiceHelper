// background.js - Enhanced with modular structure and new features
// This file handles the core extension logic and AI API calls

import { getActiveApiKey, identifyBuiltinKeyId, getSettings } from './utils/apiManager.js';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const DEFAULT_SETTINGS = {
  apiProvider: 'groq',
  notificationOpacity: 0.9,
  notificationPosition: 'center',
  questionType: 'mcq',
  displayDuration: 3
};

const QUESTION_TYPES = {
  MCQ: 'mcq',
  EXPLAIN: 'explain',
  SHORT_ANSWER: 'short-answer',
  LONG_ANSWER: 'long-answer',
  WORD_MEANING: 'word-meaning'
};

const QUESTION_TYPE_CONFIG = {
  [QUESTION_TYPES.MCQ]: {
    prompt: (text) => `The following is a multiple choice question with options. Please respond with ONLY the best answer in the format "a: [option]" (just the letter and the selected option, nothing else): ${text}`,
    systemMessage: 'You are a helpful assistant that answers multiple choice questions. Always respond with ONLY the letter and selected option, nothing else.',
    maxTokens: 50
  },
  [QUESTION_TYPES.EXPLAIN]: {
    prompt: (text) => `Explain the following concept clearly and concisely:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that explains concepts clearly and concisely.',
    maxTokens: 300
  },
  [QUESTION_TYPES.SHORT_ANSWER]: {
    prompt: (text) => `Answer the following question in exactly 30 words or less:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that provides concise answers. Always limit your response to 30 words or less.',
    maxTokens: 100
  },
  [QUESTION_TYPES.LONG_ANSWER]: {
    prompt: (text) => `Provide a detailed answer to the following question in approximately 70 words:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that provides detailed answers. Aim for approximately 70 words in your response.',
    maxTokens: 200
  },
  [QUESTION_TYPES.WORD_MEANING]: {
    prompt: (text) => `Define and explain the meaning of the following word or phrase:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that defines and explains word meanings clearly.',
    maxTokens: 150
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Create context menu item on installation
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "processSelection",
    title: "Get AI answer",
    contexts: ["selection"]
  });
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "processSelection" && info.selectionText) {
    processSelectedText(info.selectionText, tab.id);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'processSelection' && request.text) {
    processSelectedText(request.text, sender.tab.id);
  }
});

// Listen for coding problem requests from content script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'solveCodingProblem') {
    console.log('[Coding Assistant] Received problem request from:', sender.tab?.id);
    handleCodingProblem(request, sender.tab?.id, sendResponse);
    return true; // Keep message channel open for async response
  }
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener(async function (command) {
  console.log('Command received:', command);

  if (command === "process-selection") {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        console.error('No active tab found');
        return;
      }

      const tabId = tab.id;
      console.log('Processing selection for tab:', tabId);

      // Check if we can inject scripts into this page
      if (tab.url && (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('edge://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('chrome-extension://'))) {
        console.error('Cannot run on this type of page:', tab.url);
        return;
      }

      // Get selected text
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => window.getSelection().toString()
        });

        if (results && results[0] && results[0].result) {
          const selectedText = results[0].result.trim();
          console.log('Selected text:', selectedText);

          if (selectedText) {
            processSelectedText(selectedText, tabId);
          } else {
            console.log('No text selected');
            await showNotificationOnPage(tabId, 'Please select some text first');
          }
        }
      } catch (executeError) {
        console.error('Execute script error:', executeError);
      }

    } catch (error) {
      console.error('Command handler error:', error);
    }
  }
});

// ============================================================================
// CORE PROCESSING FUNCTIONS
// ============================================================================

/**
 * Process the selected text with AI
 * @param {string} selectedText - The text selected by user
 * @param {number} tabId - The tab ID where text was selected
 */
async function processSelectedText(selectedText, tabId) {
  if (!selectedText || selectedText.trim() === "") {
    return;
  }

  console.log('Processing text:', selectedText);

  const settings = await getSettings();
  const provider = settings.apiProvider;
  const questionType = settings.questionType;

  // Show loading notification
  showNotificationOnPage(tabId, "...", settings);

  // Call the appropriate API
  callAIAPI(provider, selectedText, questionType, settings, tabId);
}

/**
 * Call the selected AI API
 * @param {string} provider - API provider name
 * @param {string} apiKey - API key
 * @param {string} text - User's selected text
 * @param {string} questionType - Type of question
 * @param {Object} settings - User settings
 * @param {number} tabId - Tab ID for displaying results
 */
async function callAIAPI(provider, text, questionType, settings, tabId) {
  const config = QUESTION_TYPE_CONFIG[questionType];
  const prompt = config.prompt(text);
  const systemMessage = config.systemMessage;
  const maxTokens = config.maxTokens;

  console.log(`Calling ${provider} API for question type: ${questionType}`);

  const failedKeys = new Set();
  let success = false;
  let result = null;

  while (!success) {
    let apiKey;
    try {
      apiKey = await getActiveApiKey(settings, failedKeys);
    } catch (error) {
      showNotificationOnPage(tabId, error.message, settings);
      return;
    }

    let apiUrl = '';
    let headers = {};
    let requestBody = {};

    switch (provider) {
    case 'groq':
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      };
      break;

    case 'gemini':
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      headers = {
        'Content-Type': 'application/json'
      };
      apiUrl += `?key=${apiKey}`;
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${systemMessage}\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: maxTokens * 3,
          temperature: 0.2
        }
      };
      break;

    case 'deepseek':
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'deepseek/deepseek-r1:free',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      };
      break;

    case 'perplexity':
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'perplexity/llama-3.1-sonar-small-128k-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.2
      };
      break;
  }

  console.log(`API URL: ${apiUrl.split('?')[0]}`);

  // Make API request
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      console.log(`${provider} API Response Status: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        console.error(`API Error Response: ${text}`);

        if (response.status === 401 || response.status === 429 || response.status === 400) {
          if (settings.apiMode === 'builtin' && settings.autoSwitchEnabled) {
            const failedId = identifyBuiltinKeyId(apiKey);
            if (failedId) {
              failedKeys.add(failedId);
              console.warn(`Key ${failedId} failed with ${response.status}. Trying next key...`);
              continue; // Retry loop
            }
          }
        }

        let errorMessage = '';
        if (response.status === 402 && provider === 'deepseek') {
          errorMessage = "DeepSeek account has insufficient balance. Please add credits to your account.";
        } else if (response.status === 401) {
          errorMessage = `Invalid ${provider} API key. Please check your settings.`;
        } else if (response.status === 429) {
          errorMessage = `${provider} rate limit exceeded. Please wait and try again.`;
        } else if (response.status >= 500) {
          errorMessage = `${provider} server error. Please try again later.`;
        } else {
          errorMessage = `${provider} API error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API Response Data:', JSON.stringify(data));

      result = extractResponse(provider, data);
      success = true;
      
      // Display result with settings
      showResultOnPage(tabId, result, settings);
    } catch (error) {
      console.error('API Request Error:', error);
      showNotificationOnPage(tabId, error.message, settings);
      return;
    }
  }
}

/**
 * Extract response text from API response data
 * @param {string} provider - API provider name
 * @param {Object} data - API response data
 * @returns {string} Extracted response text
 */
function extractResponse(provider, data) {
  let result = '';

  try {
    if (provider === 'groq' || provider === 'deepseek' || provider === 'perplexity') {
      result = data.choices[0].message.content.trim();
    } else if (provider === 'gemini') {
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        const content = candidate.content;
        const finishReason = candidate.finishReason;

        if (content && content.parts && content.parts[0] && content.parts[0].text) {
          result = content.parts[0].text.trim();
        } else if (finishReason === 'MAX_TOKENS') {
          throw new Error('Response was truncated. The model needs more tokens to complete the answer.');
        } else if (finishReason === 'SAFETY') {
          throw new Error('Response blocked by safety filters.');
        } else {
          throw new Error('Gemini returned an empty response. Please try again.');
        }
      } else {
        throw new Error('Unexpected Gemini API response format');
      }
    }

    if (!result) {
      throw new Error('Empty response from AI');
    }

    return result;
  } catch (error) {
    console.error('Error extracting response:', error);
    throw error;
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS (Injected into page)
// ============================================================================

/**
 * Show result notification on the page
 * @param {number} tabId - Tab ID
 * @param {string} result - Result text
 * @param {Object} settings - User settings
 */
function showResultOnPage(tabId, result, settings) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (text, config) => {
      // Remove any existing notification
      const existing = document.getElementById('ai-choice-helper-notification');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      // Create notification element
      const notification = document.createElement('div');
      notification.id = 'ai-choice-helper-notification';
      notification.textContent = text;

      // Apply base styles
      notification.style.position = 'fixed';
      notification.style.padding = '5px 9px';
      notification.style.fontSize = '16px';
      notification.style.fontWeight = 'normal';
      notification.style.color = '#5f5e5e';
      notification.style.zIndex = '2147483647';
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease-in-out';
      notification.style.fontFamily = 'monospace';
      notification.style.maxWidth = '80%';
      notification.style.wordWrap = 'break-word';

      // Apply position styles
      const position = config.notificationPosition || 'center';
      switch (position) {
        case 'center':
          notification.style.top = '50%';
          notification.style.left = '50%';
          notification.style.transform = 'translate(-50%, -50%)';
          break;
        case 'top-left':
          notification.style.top = '20px';
          notification.style.left = '20px';
          break;
        case 'top-right':
          notification.style.top = '20px';
          notification.style.right = '20px';
          break;
        case 'bottom-left':
          notification.style.bottom = '20px';
          notification.style.left = '20px';
          break;
        case 'bottom-right':
          notification.style.bottom = '20px';
          notification.style.right = '20px';
          break;
        default:
          notification.style.top = '50%';
          notification.style.left = '50%';
          notification.style.transform = 'translate(-50%, -50%)';
      }

      // Add notification to page
      document.body.appendChild(notification);

      // Animate notification
      const targetOpacity = config.notificationOpacity || 0.9;
      const displayDuration = (config.displayDuration || 3) * 1000;

      // Fade in
      setTimeout(() => {
        notification.style.opacity = targetOpacity.toString();

        // Fade out and remove
        setTimeout(() => {
          notification.style.opacity = '0';

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }, displayDuration);
      }, 10);
    },
    args: [result, settings]
  });
}

/**
 * Show notification on the page
 * @param {number} tabId - Tab ID
 * @param {string} message - Message text
 * @param {Object} settings - User settings
 */
function showNotificationOnPage(tabId, message, settings = DEFAULT_SETTINGS) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (text, config) => {
      // Remove any existing notification
      const existing = document.getElementById('ai-choice-helper-notification');
      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }

      // Create notification element
      const notification = document.createElement('div');
      notification.id = 'ai-choice-helper-notification';
      notification.textContent = text;

      // Apply base styles
      notification.style.position = 'fixed';
      notification.style.padding = '5px 9px';
      notification.style.fontSize = '16px';
      notification.style.fontWeight = 'normal';
      notification.style.color = '#535353';
      notification.style.zIndex = '2147483647';
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease-in-out';
      notification.style.fontFamily = 'Arial, sans-serif';
      notification.style.maxWidth = '80%';
      notification.style.wordWrap = 'break-word';
      notification.style.textAlign = 'center';

      // Apply position styles
      const position = config.notificationPosition || 'center';
      switch (position) {
        case 'center':
          notification.style.top = '50%';
          notification.style.left = '50%';
          notification.style.transform = 'translate(-50%, -50%)';
          break;
        case 'top-left':
          notification.style.top = '20px';
          notification.style.left = '20px';
          break;
        case 'top-right':
          notification.style.top = '20px';
          notification.style.right = '20px';
          break;
        case 'bottom-left':
          notification.style.bottom = '20px';
          notification.style.left = '20px';
          break;
        case 'bottom-right':
          notification.style.bottom = '20px';
          notification.style.right = '20px';
          break;
        default:
          notification.style.top = '50%';
          notification.style.left = '50%';
          notification.style.transform = 'translate(-50%, -50%)';
      }

      // Add notification to page
      document.body.appendChild(notification);

      // Animate notification
      const targetOpacity = config.notificationOpacity || 0.9;
      const displayDuration = (config.displayDuration || 3) * 1000;

      // Fade in
      setTimeout(() => {
        notification.style.opacity = targetOpacity.toString();

        // Fade out and remove
        setTimeout(() => {
          notification.style.opacity = '0';

          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }, displayDuration);
      }, 10);
    },
    args: [message, settings]
  });
}

// ============================================================================
// CODING ASSISTANT FEATURE
// ============================================================================

/**
 * Handle coding problem requests from content script
 * @param {Object} request - Request object with problemText and language
 * @param {number} tabId - Tab ID that sent the request
 * @param {Function} sendResponse - Callback to send response
 */
async function handleCodingProblem(request, tabId, sendResponse) {
  const { problemText, language, platform } = request;

  console.log(`[Coding Assistant] Processing ${platform} problem with language: ${language}`);

  if (!problemText) {
    sendResponse({ success: false, error: 'No problem text provided' });
    return;
  }

  const settings = await getSettings();
  const provider = settings.apiProvider;

  // Build prompt based on language selection
  const prompt = buildCodingPrompt(problemText, language);
  const systemMessage = getCodingSystemMessage(language);
  const maxTokens = language === 'explain' ? 800 : 1200;

  // Call AI API
  callCodingAI(provider, prompt, systemMessage, maxTokens, sendResponse, settings);
}

/**
 * Build prompt for coding problem based on language
 * @param {string} problemText - The problem statement
 * @param {string} language - Selected language or 'explain'
 * @returns {string} Formatted prompt
 */
function buildCodingPrompt(problemText, language) {
  const languageMap = {
    'cpp': 'C++',
    'java': 'Java',
    'python': 'Python',
    'javascript': 'JavaScript'
  };

  let prompt = `You are an expert competitive programmer. Analyze the following coding problem:\n\n${problemText}\n\n`;

  if (language === 'explain') {
    prompt += `Please provide a comprehensive explanation including:
1. **Problem Understanding**: Explain what the problem is asking for in simple terms
2. **Optimal Approach**: Describe the best algorithm or strategy to solve this
3. **Key Concepts**: What programming concepts, data structures, or algorithms are needed?
4. **Step-by-Step Logic**: Break down the solution logic step by step
5. **Time & Space Complexity**: Analyze the complexity of the optimal solution

Format your response clearly with headers and bullet points where appropriate.`;
  } else {
    const lang = languageMap[language];
    prompt += `Please provide:
1. **Problem Understanding**: Brief explanation of what the problem asks
2. **Optimal Approach**: The best strategy to solve this problem
3. **Key Concepts**: Data structures and algorithms used
4. **Time & Space Complexity**: Big O analysis
5. **${lang} Solution**: Provide clean, optimized, well-commented ${lang} code that solves this problem

For the code:
- Use best practices and idiomatic ${lang} style
- Add clear comments explaining the logic
- Make it production-ready and readable
- Format it properly with proper indentation

Format the code in markdown code blocks using \`\`\`${language}.`;
  }

  return prompt;
}

/**
 * Get system message for coding assistant
 * @param {string} language - Selected language
 * @returns {string} System message
 */
function getCodingSystemMessage(language) {
  if (language === 'explain') {
    return 'You are an expert programming tutor who explains coding problems clearly and comprehensively. Break down complex concepts into understandable parts.';
  } else {
    return 'You are an expert competitive programmer and coding mentor. Provide clear explanations and write clean, optimized, well-documented code following best practices.';
  }
}

/**
 * Call AI API for coding problem
 * @param {string} provider - API provider
 * @param {string} apiKey - API key
 * @param {string} prompt - User prompt
 * @param {string} systemMessage - System message
 * @param {number} maxTokens - Max tokens for response
 * @param {Function} sendResponse - Callback function
 */
async function callCodingAI(provider, prompt, systemMessage, maxTokens, sendResponse, settings) {
  console.log(`[Coding Assistant] Calling ${provider} API with max tokens: ${maxTokens}`);

  const failedKeys = new Set();
  let success = false;
  let result = null;

  while (!success) {
    let apiKey;
    try {
      apiKey = await getActiveApiKey(settings, failedKeys);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
      return;
    }

    let apiUrl = '';
    let headers = {};
    let requestBody = {};

    switch (provider) {
    case 'groq':
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      };
      break;

    case 'gemini':
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      headers = {
        'Content-Type': 'application/json'
      };
      apiUrl += `?key=${apiKey}`;
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: `${systemMessage}\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: maxTokens * 3,
          temperature: 0.3
        }
      };
      break;

    case 'deepseek':
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'deepseek/deepseek-r1:free',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      };
      break;

    case 'perplexity':
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'perplexity/llama-3.1-sonar-small-128k-chat',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.3
      };
      break;
  }

  // Make API request
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });

      console.log(`[Coding Assistant] ${provider} API Response Status: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        console.error(`[Coding Assistant] API Error Response: ${text}`);

        if (response.status === 401 || response.status === 429 || response.status === 400) {
          if (settings.apiMode === 'builtin' && settings.autoSwitchEnabled) {
            const failedId = identifyBuiltinKeyId(apiKey);
            if (failedId) {
              failedKeys.add(failedId);
              console.warn(`[Coding Assistant] Key ${failedId} failed with ${response.status}. Trying next...`);
              continue; // Retry loop
            }
          }
        }

        let errorMessage = '';
        if (response.status === 402 && provider === 'deepseek') {
          errorMessage = "DeepSeek account has insufficient balance. Please add credits.";
        } else if (response.status === 401) {
          errorMessage = `Invalid ${provider} API key. Please check your settings.`;
        } else if (response.status === 429) {
          errorMessage = `${provider} rate limit exceeded. Please wait and try again.`;
        } else if (response.status >= 500) {
          errorMessage = `${provider} server error. Please try again later.`;
        } else {
          errorMessage = `${provider} API error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[Coding Assistant] API Response received');

      result = extractResponse(provider, data);
      success = true;

      sendResponse({ success: true, result: result });
    } catch (error) {
      console.error('[Coding Assistant] API Request Error:', error);
      sendResponse({ success: false, error: error.message });
      return;
    }
  }
}
