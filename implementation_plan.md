# Multi Built-in API Key Management Implementation Plan

This document outlines the architecture and implementation steps to add multi built-in API key management, custom API key support, and an automatic fallback system.

## User Review Required

> [!IMPORTANT]
> **API Key Storage & Scope:** The user requested adding an "Admin Style" management panel to enable/disable and reorder built-in keys. These custom states (enabled/disabled, order) will need to be saved in `chrome.storage.sync`. Is it acceptable that users can view and toggle built-in keys, but the actual key values are hardcoded in a configuration file and never exposed in the UI? 
> 
> **Architecture Clarification:** The codebase currently has API call logic duplicated across `background.js` and `utils/apiHandler.js`. I will centralize the key fetching and retry logic in a new `utils/apiManager.js` service, but I will need to integrate it with the existing `background.js` execution flow.

## Open Questions

1. Should the `BUILTIN_KEYS` array be scoped per provider (e.g., multiple Groq keys, multiple Gemini keys), or are we assuming all built-in keys are for a primary provider (like Groq)? For this plan, I assume they are global/primary provider keys unless specified otherwise.
2. For the "Auto Switch On Failure" fallback, should the "failed" state of a key reset after a certain time, or just reset on every new extension load? (I will plan to reset it per request session or keep a short-lived memory).

## Proposed Changes

---

### Shared Utilities & State

#### [MODIFY] [constants.js](file:///d:/Programs/CA4%20-%20Copy/utils/constants.js)
- Define a constant array `BUILTIN_KEYS` containing objects with `id`, `name`, `apiKey` (placeholder/actual), `enabled`, and `priority`.
- Update `DEFAULT_SETTINGS` to include:
  - `apiMode`: 'builtin' or 'custom'
  - `selectedBuiltinKey`: ID of the default key
  - `customApiKey`: Empty string by default
  - `autoSwitchEnabled`: Boolean

#### [NEW] [apiManager.js](file:///d:/Programs/CA4%20-%20Copy/utils/apiManager.js)
- Create a centralized service.
- Implement `async function getActiveApiKey()` to determine the current key based on `apiMode` and `selectedBuiltinKey`.
- Implement `async function getNextFallbackKey(failedKeyId)` to support the fallback system when a key is rate-limited or invalid.

---

### Background Worker Logic

#### [MODIFY] [background.js](file:///d:/Programs/CA4%20-%20Copy/background.js)
- Refactor the API execution flow (`callAIAPI` and `callCodingAI`) to dynamically fetch the key using `apiManager.js`.
- Wrap the API fetch call in a retry loop. If a 429 (Rate Limit) or 401 (Invalid) error occurs and `autoSwitchEnabled` is true, automatically retrieve the next active built-in key and retry the request until a working key is found or all keys are exhausted.
- Update the UI notification state to reflect when a fallback switch occurs.

---

### Frontend UI & Settings

#### [MODIFY] [popup.html](file:///d:/Programs/CA4%20-%20Copy/popup.html)
- **API Source Section**: Add radio buttons to select between "Built-in API Keys" and "Custom API Key".
- **Built-in Key Selector**: Add a dropdown/list showing only the names of available built-in keys (value hidden).
- **Custom Key Section**: Adapt the existing password input UI to serve as the custom API key input, reusing the eye toggle functionality.
- **Admin Management Panel**: Add a new collapsible section "Built-in API Keys" displaying a list of built-in keys with toggles to enable/disable them.
- **Fallback Setting**: Add an "Auto Switch On Failure" checkbox.
- **Status UI**: Add a small indicator showing "Current Source" and "Current Key" (by name).

#### [MODIFY] [popup.js](file:///d:/Programs/CA4%20-%20Copy/popup.js)
- Add logic to toggle visibility between the "Built-in" and "Custom" sections based on the selected API Source.
- Dynamically render the Built-in Key Selector and Admin Management Panel based on the keys stored in `chrome.storage.sync` (merged with `constants.js` defaults).
- Handle saving of the new properties (`apiMode`, `selectedBuiltinKey`, `customApiKey`, `autoSwitchEnabled`).

#### [MODIFY] [popup.css](file:///d:/Programs/CA4%20-%20Copy/popup.css)
- Add styling for the new API Source radio selectors.
- Add styling for the Admin Management Panel (toggle switches, list items).
- Ensure all new elements match the modernized minimal aesthetic recently applied.

## Verification Plan

### Automated Tests
- No automated unit tests exist in the current setup. 

### Manual Verification
1. **UI State Integrity**: Open the popup, toggle between Built-in and Custom, ensure the correct inputs appear/hide.
2. **Admin Controls**: Disable a key in the admin panel and ensure it disappears from the main selector.
3. **Save/Load**: Save settings, close popup, reopen, and verify state persists.
4. **Fallback Execution**: Temporarily inject an invalid API key as the primary built-in key. Trigger a text explanation and verify the extension automatically falls back to the secondary key and succeeds without crashing.
5. **Security Check**: Inspect DOM to ensure actual built-in API keys are never rendered in HTML values or text contents.
