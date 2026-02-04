// content.js
// This script is injected into webpages
// It handles the listening for text selection events and custom selection styling

console.log('[Content] Content script loaded');

// Inject custom CSS for black selection color
(function () {
  console.log('[Content] Injecting custom selection styles');
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
  console.log('[Content] Selection styles injected successfully');
})();

// Listen for mouseup events to detect text selection
console.log('[Content] Setting up mouseup event listener');
document.addEventListener('mouseup', function (event) {
  // Check if selection exists and is not empty
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();

  if (selectedText) {
    console.log('[Content] Text selected:', selectedText.substring(0, 50) + '...');
  }

  if (selectedText && isLikelyMultipleChoice(selectedText)) {
    console.log('[Content] Detected multiple choice question, notifying background');
    // Notify background script to process the selection
    chrome.runtime.sendMessage({
      action: 'processSelection',
      text: selectedText
    });
  } else if (selectedText) {
    console.log('[Content] Selected text does not match multiple choice pattern');
  }

});

// Helper function to detect if text is likely a multiple choice question
// This is just a basic implementation - you may want to enhance it
function isLikelyMultipleChoice(text) {
  console.log('[Content] Checking if text is multiple choice...');;
  // Look for patterns like "1. Option" or "a) Option" or "A. Option"
  const mcPatterns = [
    /[a-d][\.\)]\s+\w+/i,  // a. Option or a) Option
    /[1-4][\.\)]\s+\w+/i,  // 1. Option or 1) Option
    /option\s+[a-d]:/i,    // Option A:
    /\b(multiple choice|choose one|select one)\b/i  // Keywords
  ];

  // Check if the text contains at least one of the patterns
  const isMatch = mcPatterns.some(pattern => pattern.test(text));
  console.log('[Content] Multiple choice pattern match:', isMatch);
  return isMatch;
}

// Listen for messages from the background script
console.log('[Content] Setting up message listener');
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('[Content] Message received from background:', request);

  if (request.action === 'getSelectedText') {
    const text = window.getSelection().toString();
    console.log('[Content] Sending selected text to background:', text.substring(0, 50) + '...');
    sendResponse({ text: text });
  }
});