// popup.js - Enhanced with new features
// This file handles the popup UI and settings management

import { BUILTIN_KEYS, DEFAULT_SETTINGS } from './utils/constants.js';

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
    
    // API Source elements
    modeBuiltin: document.getElementById('mode-builtin'),
    modeCustom: document.getElementById('mode-custom'),
    builtinSection: document.getElementById('builtin-section'),
    customSection: document.getElementById('custom-section'),
    builtinKeySelector: document.getElementById('builtin-key-selector'),
    autoSwitchEnabled: document.getElementById('auto-switch-enabled'),
    builtinAdminList: document.getElementById('builtin-admin-list'),
    customApiKey: document.getElementById('custom-api-key'),
    customApiKeyLabel: document.querySelector('label[for="custom-api-key"]'),

    // Display elements
    notificationPosition: document.getElementById('notification-position'),
    notificationOpacity: document.getElementById('notification-opacity'),
    displayDuration: document.getElementById('display-duration'),
    questionType: document.getElementById('question-type'),
    saveButton: document.getElementById('save-button'),
    statusElement: document.getElementById('status'),
    opacityValue: document.getElementById('opacity-value'),
    durationValue: document.getElementById('duration-value')
  };

  let settingsState = { ...DEFAULT_SETTINGS };
  let currentDisabledKeys = [];

  // Toggle sections based on mode & dynamically update based on selected AI Provider
  function updateUI() {
    const provider = elements.apiProvider.value; // groq, gemini, deepseek, perplexity
    const providerName = elements.apiProvider.options[elements.apiProvider.selectedIndex].text.split(' ')[0]; // E.g., "Groq", "Gemini"

    if (elements.modeBuiltin.checked) {
      elements.builtinSection.style.display = 'block';
      elements.customSection.style.display = 'none';
      renderBuiltinKeys(provider);
    } else {
      elements.builtinSection.style.display = 'none';
      elements.customSection.style.display = 'block';
      
      // Update custom input field for specific provider
      elements.customApiKeyLabel.textContent = `Custom ${providerName} API Key`;
      elements.customApiKey.value = settingsState[`${provider}Key`] || '';
    }
  }

  // When AI Provider Dropdown changes
  elements.apiProvider.addEventListener('change', () => {
    updateUI();
  });

  // When Radio modes change
  elements.modeBuiltin.addEventListener('change', updateUI);
  elements.modeCustom.addEventListener('change', updateUI);

  // Sync custom key input to settingsState immediately so it isn't lost on switch
  elements.customApiKey.addEventListener('input', (e) => {
    const provider = elements.apiProvider.value;
    settingsState[`${provider}Key`] = e.target.value.trim();
  });

  // Keep track of active builtin selection in settingsState
  elements.builtinKeySelector.addEventListener('change', (e) => {
    const provider = elements.apiProvider.value;
    const selectedField = `selectedBuiltin${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
    settingsState[selectedField] = e.target.value;
  });

  // Render Built-in Keys Selector and Admin List based on Provider
  function renderBuiltinKeys(provider) {
    elements.builtinKeySelector.innerHTML = '';
    elements.builtinAdminList.innerHTML = '';

    const keys = BUILTIN_KEYS[provider] || [];
    const selectedField = `selectedBuiltin${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
    const selectedId = settingsState[selectedField];

    if (keys.length === 0) {
       elements.builtinKeySelector.innerHTML = '<option value="">No Built-in Keys for this Provider</option>';
       elements.builtinAdminList.innerHTML = '<div style="color:var(--text-light);font-size:12px;">No keys configured.</div>';
       return;
    }

    keys.forEach(key => {
      const isDisabled = currentDisabledKeys.includes(key.id);
      
      // Add to selector if enabled
      if (!isDisabled) {
        const option = document.createElement('option');
        option.value = key.id;
        option.textContent = key.name;
        if (key.id === selectedId) option.selected = true;
        elements.builtinKeySelector.appendChild(option);
      }

      // Add to admin list
      const adminItem = document.createElement('div');
      adminItem.className = 'admin-item';
      
      adminItem.innerHTML = `
        <span class="admin-item-name">${key.name}</span>
        <label class="switch">
          <input type="checkbox" data-id="${key.id}" ${!isDisabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;
      
      // Toggle logic for admin panel
      adminItem.querySelector('input').addEventListener('change', function(e) {
        if (e.target.checked) {
          currentDisabledKeys = currentDisabledKeys.filter(id => id !== key.id);
        } else {
          currentDisabledKeys.push(key.id);
        }
        // Re-render to reflect enabled/disabled states
        renderBuiltinKeys(provider);
      });

      elements.builtinAdminList.appendChild(adminItem);
    });

    // Ensure state reflects a valid option if current selection became disabled
    if (elements.builtinKeySelector.options.length > 0 && elements.builtinKeySelector.value) {
      settingsState[selectedField] = elements.builtinKeySelector.value;
    } else {
      settingsState[selectedField] = '';
    }
  }

  // Load saved settings
  const storageKeys = Object.keys(DEFAULT_SETTINGS).concat(['disabledBuiltinKeys']);
  chrome.storage.sync.get(storageKeys, function (data) {
    settingsState = { ...DEFAULT_SETTINGS, ...data };
    currentDisabledKeys = data.disabledBuiltinKeys || [];

    // Initialize UI fields that are persistent across views
    if (settingsState.apiProvider) elements.apiProvider.value = settingsState.apiProvider;
    elements.modeCustom.checked = (settingsState.apiMode === 'custom');
    elements.modeBuiltin.checked = (settingsState.apiMode !== 'custom');
    elements.autoSwitchEnabled.checked = settingsState.autoSwitchEnabled !== false;

    // Display Settings
    elements.notificationPosition.value = settingsState.notificationPosition;
    elements.notificationOpacity.value = settingsState.notificationOpacity;
    elements.displayDuration.value = settingsState.displayDuration;
    elements.questionType.value = settingsState.questionType;
    elements.opacityValue.textContent = elements.notificationOpacity.value;
    elements.durationValue.textContent = elements.displayDuration.value;

    // Run UI update to populate dynamic fields
    updateUI();
  });

  // Real-time slider updates
  elements.notificationOpacity.addEventListener('input', function () {
    elements.opacityValue.textContent = this.value;
  });

  elements.displayDuration.addEventListener('input', function () {
    elements.durationValue.textContent = this.value;
  });

  // Save settings
  elements.saveButton.addEventListener('click', function () {
    // Collect settings that aren't dynamically bound to settingsState
    settingsState.apiProvider = elements.apiProvider.value;
    settingsState.apiMode = elements.modeBuiltin.checked ? 'builtin' : 'custom';
    settingsState.autoSwitchEnabled = elements.autoSwitchEnabled.checked;
    settingsState.notificationPosition = elements.notificationPosition.value;
    settingsState.notificationOpacity = parseFloat(elements.notificationOpacity.value);
    settingsState.displayDuration = parseInt(elements.displayDuration.value);
    settingsState.questionType = elements.questionType.value;

    const provider = settingsState.apiProvider;

    // Validate active settings based on mode
    const errors = [];
    if (settingsState.apiMode === 'custom') {
      if (!settingsState[`${provider}Key`]) {
        errors.push(`Please enter a Custom API Key for ${provider}`);
      }
    } else {
      const selectedField = `selectedBuiltin${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
      if (!settingsState[selectedField]) {
        errors.push(`No active Built-in Key selected for ${provider}. Ensure at least one is enabled.`);
      }
    }

    if (isNaN(settingsState.notificationOpacity) || settingsState.notificationOpacity < 0.1 || settingsState.notificationOpacity > 1) {
      errors.push('Opacity must be between 0.1 and 1.0');
    }

    if (isNaN(settingsState.displayDuration) || settingsState.displayDuration < 1 || settingsState.displayDuration > 10) {
      errors.push('Display duration must be between 1 and 10 seconds');
    }

    if (errors.length > 0) {
      showStatus('⚠️ ' + errors.join(', '), 'error');
      return;
    }

    // Save to Chrome storage
    const storageObject = { ...settingsState, disabledBuiltinKeys: currentDisabledKeys };
    chrome.storage.sync.set(storageObject, function () {
      if (chrome.runtime.lastError) {
        showStatus('⚠️ Error saving settings: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('✓ Settings saved successfully!', 'success');
      }
    });
  });

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