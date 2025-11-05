// Create context menu item on installation
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "processSelection",
    title: "Get AI answer",
    contexts: ["selection"]
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "processSelection" && info.selectionText) {
    processSelectedText(info.selectionText, tab.id);
  }
});

// Listen for keyboard shortcut
chrome.commands.onCommand.addListener(async function(command) {
  if (command === "process-selection") {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute script to get selected text
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getSelectedText
    }, function(selections) {
      if (selections && selections[0] && selections[0].result) {
        processSelectedText(selections[0].result, tab.id);
      }
    });
  }
});

// Function to get selected text from the page
function getSelectedText() {
  return window.getSelection().toString();
}

// Process the selected text with AI
function processSelectedText(selectedText, tabId) {
  if (!selectedText || selectedText.trim() === "") {
    return;
  }
  
  // Get settings from storage
  chrome.storage.sync.get(['apiProvider', 'openaiKey', 'geminiKey', 'deepseekKey'], function(data) {
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
      default:
        apiKey = data.openaiKey;
    }
    
    if (!apiKey) {
      // Notify user to set API key
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: showNotification,
        args: [`Please set ${provider} API key in extension settings`]
      });
      return;
    }
    
    // Show loading notification first
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: showNotification,
      args: ["..."]
    });
    
    // Prepare the prompt
    const prompt = `The following is a multiple choice question with options. Please respond with ONLY the best answer in the format "a: [option]" (just the letter and the selected option, nothing else): ${selectedText}`;
    
    // Call the appropriate API
    callAIAPI(provider, apiKey, prompt, tabId);
  });
}

// Call the selected AI API
function callAIAPI(provider, apiKey, prompt, tabId) {
  let apiUrl = '';
  let headers = {};
  let requestBody = {};
  
  // Add debugging log
  console.log(`Calling API: ${provider}`);
  
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
      // Updated to use gemini-2.5-flash model with increased token limit
      apiUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
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
          maxOutputTokens: 500,  // Increased from 50 to handle thinking tokens
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
  }
  
  // Debug log the request details (without API key)
  console.log(`API URL: ${apiUrl.split('?')[0]}`);
  console.log('Request Body:', JSON.stringify(requestBody));
  
  // Make API request
  fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    console.log(`API Response Status: ${response.status}`);
    
    if (!response.ok) {
      return response.text().then(text => {
        console.error(`API Error Response: ${text}`);
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
    console.log('API Response Data:', JSON.stringify(data));
    
    let result = '';
    
    try {
      // Extract result based on API provider
      if (provider === 'openai') {
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
      } else if (provider === 'deepseek') {
        result = data.choices[0].message.content.trim();
      }
      
      // Display result on the webpage
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: showResult,
        args: [result]
      });
    } catch (error) {
      console.error('Error parsing API response:', error);
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: showNotification,
        args: [`Error: ${error.message}`]
      });
    }
  })
  .catch(error => {
    console.error('API Request Error:', error);
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
  notification.style.padding = "2px 3px";
  notification.style.background = "transparent";
  notification.style.fontSize = "32px";
  notification.style.fontWeight = "normal";
  notification.style.color = "#000000";
  notification.style.zIndex = "9999";
  notification.style.opacity = "0";
  notification.style.transition = "opacity 5s ease-in-out";
  notification.textContent = result;
  
  // Add notification to page
  document.body.appendChild(notification);
  
  // Fade in
  setTimeout(() => {
    notification.style.opacity = "1";
    
    // Fade out and remove after 1 second
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 1000);
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
  notification.style.padding = "5px 7px";
  notification.style.background = "transparent";
  notification.style.fontSize = "16px";
  notification.style.color = "#333";
  notification.style.zIndex = "9999";
  notification.style.opacity = "0";
  notification.style.transition = "opacity 5s ease-in-out";
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