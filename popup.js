// popup.js - Enhanced with new features
// This file handles the popup UI and settings management

// Toggle password visibility
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', function () {
  // Get all form elements
  const elements = {
    apiProvider: document.getElementById('api-provider'),
    openaiKey: document.getElementById('openai-key'),
    geminiKey: document.getElementById('gemini-key'),
    deepseekKey: document.getElementById('deepseek-key'),
    perplexityKey: document.getElementById('perplexity-key'),
    notificationPosition: document.getElementById('notification-position'),
    notificationOpacity: document.getElementById('notification-opacity'),
    displayDuration: document.getElementById('display-duration'),
    questionType: document.getElementById('question-type'),
    saveButton: document.getElementById('save-button'),
    statusElement: document.getElementById('status'),
    opacityValue: document.getElementById('opacity-value'),
    durationValue: document.getElementById('duration-value')
  };

  // Default settings
  const defaultSettings = {
    apiProvider: 'openai',
    notificationOpacity: 0.9,
    notificationPosition: 'center',
    questionType: 'mcq',
    displayDuration: 3
  };

  // Load saved settings
  chrome.storage.sync.get(
    [
      'apiProvider',
      'openaiKey',
      'geminiKey',
      'deepseekKey',
      'perplexityKey',
      'notificationPosition',
      'notificationOpacity',
      'displayDuration',
      'questionType'
    ],
    function (data) {
      // API Provider
      if (data.apiProvider) {
        elements.apiProvider.value = data.apiProvider;
      }

      // API Keys
      if (data.openaiKey) {
        elements.openaiKey.value = data.openaiKey;
      }
      if (data.geminiKey) {
        elements.geminiKey.value = data.geminiKey;
      }
      if (data.deepseekKey) {
        elements.deepseekKey.value = data.deepseekKey;
      }
      if (data.perplexityKey) {
        elements.perplexityKey.value = data.perplexityKey;
      }

      // New Settings
      elements.notificationPosition.value = data.notificationPosition || defaultSettings.notificationPosition;
      elements.notificationOpacity.value = data.notificationOpacity || defaultSettings.notificationOpacity;
      elements.displayDuration.value = data.displayDuration || defaultSettings.displayDuration;
      elements.questionType.value = data.questionType || defaultSettings.questionType;

      // Update display values
      elements.opacityValue.textContent = elements.notificationOpacity.value;
      elements.durationValue.textContent = elements.displayDuration.value;
    }
  );

  // Real-time slider updates
  elements.notificationOpacity.addEventListener('input', function () {
    elements.opacityValue.textContent = this.value;
  });

  elements.displayDuration.addEventListener('input', function () {
    elements.durationValue.textContent = this.value;
  });

  // Save settings
  elements.saveButton.addEventListener('click', function () {
    const apiProvider = elements.apiProvider.value;
    const openaiKey = elements.openaiKey.value;
    const geminiKey = elements.geminiKey.value;
    const deepseekKey = elements.deepseekKey.value;
    const perplexityKey = elements.perplexityKey.value;
    const notificationPosition = elements.notificationPosition.value;
    const notificationOpacity = parseFloat(elements.notificationOpacity.value);
    const displayDuration = parseInt(elements.displayDuration.value);
    const questionType = elements.questionType.value;

    // Validate settings
    const validation = validateSettings({
      apiProvider,
      openaiKey,
      geminiKey,
      deepseekKey,
      perplexityKey,
      notificationOpacity,
      displayDuration
    });

    if (!validation.valid) {
      showStatus('⚠️ ' + validation.errors.join(', '), 'error');
      return;
    }

    // Save to Chrome storage
    chrome.storage.sync.set({
      apiProvider: apiProvider,
      openaiKey: openaiKey,
      geminiKey: geminiKey,
      deepseekKey: deepseekKey,
      perplexityKey: perplexityKey,
      notificationPosition: notificationPosition,
      notificationOpacity: notificationOpacity,
      displayDuration: displayDuration,
      questionType: questionType
    }, function () {
      if (chrome.runtime.lastError) {
        showStatus('⚠️ Error saving settings: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('✓ Settings saved successfully!', 'success');
      }
    });
  });

  // Validate settings
  function validateSettings(settings) {
    const errors = [];

    // Validate opacity
    if (isNaN(settings.notificationOpacity) || settings.notificationOpacity < 0.1 || settings.notificationOpacity > 1) {
      errors.push('Opacity must be between 0.1 and 1.0');
    }

    // Validate display duration
    if (isNaN(settings.displayDuration) || settings.displayDuration < 1 || settings.displayDuration > 10) {
      errors.push('Display duration must be between 1 and 10 seconds');
    }

    // Validate API key for selected provider
    let isValid = false;
    if (settings.apiProvider === 'openai' && settings.openaiKey) {
      isValid = true;
    } else if (settings.apiProvider === 'gemini' && settings.geminiKey) {
      isValid = true;
    } else if (settings.apiProvider === 'deepseek' && settings.deepseekKey) {
      isValid = true;
    } else if (settings.apiProvider === 'perplexity' && settings.perplexityKey) {
      isValid = true;
    }

    if (!isValid) {
      errors.push('Please provide an API key for the selected provider');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Show status message
  function showStatus(message, type) {
    elements.statusElement.textContent = message;
    elements.statusElement.className = 'status ' + type;
    elements.statusElement.style.display = 'flex';

    // Hide after 3 seconds
    setTimeout(function () {
      elements.statusElement.style.display = 'none';
    }, 3000);
  }
});