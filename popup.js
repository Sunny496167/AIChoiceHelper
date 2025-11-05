// popup.js
    function togglePassword(inputId) {
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    document.addEventListener('DOMContentLoaded', function() {
      // Load saved settings
      chrome.storage.sync.get(['apiProvider', 'openaiKey', 'geminiKey', 'deepseekKey', 'perplexityKey'], function(data) {
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
        if (data.perplexityKey) {
          document.getElementById('perplexity-key').value = data.perplexityKey;
        }
      });
      
      document.getElementById('save-button').addEventListener('click', function() {
        const apiProvider = document.getElementById('api-provider').value;
        const openaiKey = document.getElementById('openai-key').value;
        const geminiKey = document.getElementById('gemini-key').value;
        const deepseekKey = document.getElementById('deepseek-key').value;
        const perplexityKey = document.getElementById('perplexity-key').value;
        
        let isValid = false;
        
        if (apiProvider === 'openai' && openaiKey) {
          isValid = true;
        } else if (apiProvider === 'gemini' && geminiKey) {
          isValid = true;
        } else if (apiProvider === 'deepseek' && deepseekKey) {
          isValid = true;
        } else if (apiProvider === 'perplexity' && perplexityKey) {
          isValid = true;
        }
        
        if (!isValid) {
          showStatus('⚠️ Please provide an API key for the selected provider', 'error');
          return;
        }
        
        // Save to Chrome storage
        chrome.storage.sync.set({
          apiProvider: apiProvider,
          openaiKey: openaiKey,
          geminiKey: geminiKey,
          deepseekKey: deepseekKey,
          perplexityKey: perplexityKey
        }, function() {
          showStatus('✓ Settings saved successfully!', 'success');
        });
      });
      
      function showStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = 'status ' + type;
        statusElement.style.display = 'flex';
        
        // Hide after 3 seconds
        setTimeout(function() {
          statusElement.style.display = 'none';
        }, 3000);
      }
    });