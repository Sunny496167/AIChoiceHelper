document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    chrome.storage.sync.get(['apiProvider', 'openaiKey', 'geminiKey', 'deepseekKey'], function(data) {
      if (data.apiProvider) {
        document.getElementById('api-provider').value = data.apiProvider;
      }
      if (data.openaiKey) {
        document.getElementById('openai-key').value = data.openaiKey;
      }
      if (data.geminiKey) {
        document.getElementById('gemini-key').value = data.geminiKey;
      }
      if (data.deepseekKey) {
        document.getElementById('deepseek-key').value = data.deepseekKey;
      }
    });
    
    // Save settings when button is clicked
    document.getElementById('save-button').addEventListener('click', function() {
      const apiProvider = document.getElementById('api-provider').value;
      const openaiKey = document.getElementById('openai-key').value;
      const geminiKey = document.getElementById('gemini-key').value;
      const deepseekKey = document.getElementById('deepseek-key').value;
      
      // Validate that at least the selected API has a key
      let isValid = false;
      
      if (apiProvider === 'openai' && openaiKey) {
        isValid = true;
      } else if (apiProvider === 'gemini' && geminiKey) {
        isValid = true;
      } else if (apiProvider === 'deepseek' && deepseekKey) {
        isValid = true;
      }
      
      if (!isValid) {
        showStatus('Please provide an API key for the selected provider', 'error');
        return;
      }
      
      // Save to Chrome storage
      chrome.storage.sync.set({
        apiProvider: apiProvider,
        openaiKey: openaiKey,
        geminiKey: geminiKey,
        deepseekKey: deepseekKey
      }, function() {
        showStatus('Settings saved successfully!', 'success');
      });
    });
    
    function showStatus(message, type) {
      const statusElement = document.getElementById('status');
      statusElement.textContent = message;
      statusElement.className = 'status ' + type;
      statusElement.style.display = 'block';
      
      // Hide after 3 seconds
      setTimeout(function() {
        statusElement.style.display = 'none';
      }, 3000);
    }
  });