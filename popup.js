// popup.js - Enhanced with new features
// This file handles the popup UI and settings management

document.addEventListener('DOMContentLoaded', function () {
  // Password visibility toggle
  const toggleIcons = document.querySelectorAll('.toggle-password');
  toggleIcons.forEach(icon => {
    icon.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);
      
      if (input.type === 'password') {
        input.type = 'text';
        this.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>`;
        this.style.color = 'var(--text)';
      } else {
        input.type = 'password';
        this.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>`;
        this.style.color = 'var(--text-light)';
      }
    });
  });

  // Get all form elements
  const elements = {
    apiProvider: document.getElementById('api-provider'),
    groqKey: document.getElementById('groq-key'),
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
    apiProvider: 'groq',
    notificationOpacity: 0.9,
    notificationPosition: 'center',
    questionType: 'mcq',
    displayDuration: 3
  };

  // Load saved settings
  chrome.storage.sync.get(
    [
      'apiProvider',
      'groqKey',
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
      if (data.groqKey) {
        elements.groqKey.value = data.groqKey;
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
    const groqKey = elements.groqKey.value;
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
      groqKey,
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
      groqKey: groqKey,
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
    if (settings.apiProvider === 'groq' && settings.groqKey) {
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