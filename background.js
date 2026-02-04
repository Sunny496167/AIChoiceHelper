// Create context menu item on installation
chrome.runtime.onInstalled.addListener(function () {
  console.log('[Background] Extension installed/updated - Creating context menu');
  chrome.contextMenus.create({
    id: "processSelection",
    title: "Get AI answer",
    contexts: ["selection"]
  });
  console.log('[Background] Context menu created successfully');
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log('[Background] Context menu clicked', { menuItemId: info.menuItemId, hasSelection: !!info.selectionText });
  if (info.menuItemId === "processSelection" && info.selectionText) {
    console.log('[Background] Processing selection from context menu:', info.selectionText.substring(0, 50) + '...');
    processSelectedText(info.selectionText, tab.id);
  }
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener(async function (command) {
  console.log('[Background] Keyboard command triggered:', command);

  if (command === "process-selection") {
    console.log('[Background] Processing Ctrl+Q shortcut');

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[Background] Active tab found:', { tabId: tab.id, url: tab.url });

      // Execute script to get selected text (using async/await for MV3 compatibility)
      console.log('[Background] Executing script to get selection...');
      const selections = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getSelectedText
      });

      console.log('[Background] Script executed, result:', selections);

      if (selections && selections[0] && selections[0].result) {
        const selectedText = selections[0].result;
        console.log('[Background] Selected text retrieved:', selectedText.substring(0, 50) + '...');
        processSelectedText(selectedText, tab.id);
      } else {
        console.warn('[Background] No text selected or empty selection');
      }
    } catch (error) {
      console.error('[Background] Error in keyboard shortcut handler:', error);
    }
  }
});

// Function to get selected text from the page
function getSelectedText() {
  return window.getSelection().toString();
}

// Process the selected text with AI
function processSelectedText(selectedText, tabId) {
  console.log('[Background] processSelectedText called', { textLength: selectedText?.length, tabId });

  if (!selectedText || selectedText.trim() === "") {
    console.warn('[Background] Empty or whitespace-only text, ignoring');
    return;
  }

  // Get settings from storage
  console.log('[Background] Fetching API settings from storage...');
  chrome.storage.sync.get(['apiProvider', 'openaiKey', 'geminiKey', 'deepseekKey', 'perplexityKey'], function (data) {
    console.log('[Background] Storage data retrieved:', {
      provider: data.apiProvider || 'openai', hasKeys: {
        openai: !!data.openaiKey,
        gemini: !!data.geminiKey,
        deepseek: !!data.deepseekKey,
        perplexity: !!data.perplexityKey
      }
    });

    const provider = data.apiProvider || 'openai';
    let apiKey = '';

    // Get the appropriate API key
    switch (provider) {
      case 'openai':
        apiKey = data.openaiKey;
        break;
      case 'gemini':
        apiKey = data.geminiKey;
        break;
      case 'deepseek':
        apiKey = data.deepseekKey;
        break;
      case 'perplexity':
        apiKey = data.perplexityKey;
        break;
      default:
        apiKey = data.openaiKey;
    }

    if (!apiKey) {
      console.error(`[Background] No API key found for provider: ${provider}`);
      // Notify user to set API key
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: showNotification,
        args: [`Please set ${provider} API key in extension settings`]
      });
      return;
    }

    console.log(`[Background] API key found for ${provider}, proceeding...`);;

    // Show loading notification first
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: showNotification,
      args: ["..."]
    });

    // Prepare the prompt
    const prompt = `The following is a multiple choice question with options. Please respond with ONLY the best answer in the format "a: [option]" (just the letter and the selected option, nothing else): ${selectedText}`;
    console.log('[Background] Prompt prepared, calling AI API...');

    // Call the appropriate API
    callAIAPI(provider, apiKey, prompt, tabId);
  });
}

// Call the selected AI API
function callAIAPI(provider, apiKey, prompt, tabId) {
  let apiUrl = '';
  let headers = {};
  let requestBody = {};

  console.log(`[Background] callAIAPI called with provider: ${provider}`);;

  switch (provider) {
    case 'openai':
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'openai/chatgpt-4o-latest',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers multiple choice questions. Always respond with ONLY the letter and selected option, nothing else.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50
      };
      break;

    case 'gemini':
      // Use v1beta endpoint for gemini-1.5-flash
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      headers = {
        'Content-Type': 'application/json'
      };
      // Append API key as query parameter
      apiUrl += `?key=${apiKey}`;
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1500,
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
          { role: 'system', content: 'You are a helpful assistant that answers multiple choice questions. Always respond with ONLY the letter and selected option, nothing else.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50
      };
      break;

    case 'perplexity':
      apiUrl = 'https://api.perplexity.ai/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'sonar',  // Updated model name
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers multiple choice questions. Always respond with ONLY the letter and selected option, nothing else.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.2
      };
      break;
  }

  // Debug log the request details (without API key)
  console.log(`[Background] API URL: ${apiUrl.split('?')[0]}`);
  console.log('[Background] Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('[Background] Sending API request...');;

  // Make API request
  fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  })
    .then(response => {
      console.log(`[Background] API Response Status: ${response.status}`);;

      if (!response.ok) {
        return response.text().then(text => {
          console.error(`[Background] API Error Response: ${text}`);
          let errorData;
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = { error: { message: text } };
          }

          // Create user-friendly error message based on status code and provider
          let errorMessage = '';
          if (response.status === 402 && provider === 'deepseek') {
            errorMessage = "DeepSeek account has insufficient balance. Please add credits to your account.";
          } else if (response.status === 401) {
            errorMessage = `Invalid ${provider} API key. Please check your settings.`;
          } else if (errorData && errorData.error && errorData.error.message) {
            errorMessage = `${provider} API error: ${errorData.error.message}`;
          } else {
            errorMessage = `${provider} API error: ${response.status}`;
          }

          throw new Error(errorMessage);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('[Background] API Response Data:', JSON.stringify(data, null, 2));;

      let result = '';

      try {
        // Extract result based on API provider
        if (provider === 'openai' || provider === 'deepseek' || provider === 'perplexity') {
          result = data.choices[0].message.content.trim();
        } else if (provider === 'gemini') {
          // Improved Gemini response handling
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

        // Display result on the webpage
        console.log('[Background] Displaying result on webpage:', result);
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: showResult,
          args: [result]
        });
      } catch (error) {
        console.error('[Background] Error parsing API response:', error);;
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: showNotification,
          args: [`Error: ${error.message}`]
        });
      }
    })
    .catch(error => {
      console.error('[Background] API Request Error:', error);;
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: showNotification,
        args: [error.message]
      });
    });
}

// Function to be injected - Show result notification
function showResult(result) {
  // Remove any existing notification
  const existingNotification = document.getElementById("ai-choice-helper-notification");
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.id = "ai-choice-helper-notification";
  notification.style.position = "fixed";
  notification.style.top = "50%";
  notification.style.left = "50%";
  notification.style.transform = "translate(-50%, -50%)";
  notification.style.padding = "5px 9px";
  notification.style.fontSize = "16px";
  notification.style.fontWeight = "normal";
  notification.style.color = "#5f5e5e4e";
  notification.style.zIndex = "2147483647";
  notification.style.opacity = "0";
  notification.style.transition = "opacity 0.3s ease-in-out";
  notification.style.fontFamily = "monospace";
  notification.textContent = result;

  // Add notification to page
  document.body.appendChild(notification);

  // Fade in
  setTimeout(() => {
    notification.style.opacity = "1";

    // Fade out and remove after 2 seconds
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }, 10);
}

// Function to be injected - Show generic notification
function showNotification(message) {
  // Remove any existing notification
  const existingNotification = document.getElementById("ai-choice-helper-notification");
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.id = "ai-choice-helper-notification";
  notification.style.position = "fixed";
  notification.style.top = "50%";
  notification.style.left = "50%";
  notification.style.transform = "translate(-50%, -50%)";
  notification.style.fontSize = "16px";
  notification.style.color = "#535353ff";
  notification.style.zIndex = "2147483647";
  notification.style.opacity = "0";
  notification.style.transition = "opacity 0.3s ease-in-out";
  notification.style.fontFamily = "Arial, sans-serif";
  notification.style.maxWidth = "400px";
  notification.style.textAlign = "center";
  notification.textContent = message;

  // Add notification to page
  document.body.appendChild(notification);

  // Fade in
  setTimeout(() => {
    notification.style.opacity = "1";

    // Fade out and remove after 3 seconds for better readability
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }, 10);
}