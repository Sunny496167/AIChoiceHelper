// content.js
// This script is injected into webpages
// It handles the listening for text selection events and custom selection styling

// Inject custom CSS for black selection color
(function() {
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
})();

// Listen for mouseup events to detect text selection
document.addEventListener('mouseup', function(event) {
  // Check if selection exists and is not empty
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  // Optional: Auto-detect multiple choice questions
  // Uncomment this code if you want the extension to automatically process
  // selected text that appears to be a multiple choice question
  
  
  if (selectedText && isLikelyMultipleChoice(selectedText)) {
    // Notify background script to process the selection
    chrome.runtime.sendMessage({
      action: 'processSelection',
      text: selectedText
    });
  }
  
});

// Helper function to detect if text is likely a multiple choice question
// This is just a basic implementation - you may want to enhance it
function isLikelyMultipleChoice(text) {
  // Look for patterns like "1. Option" or "a) Option" or "A. Option"
  const mcPatterns = [
    /[a-d][\.\)]\s+\w+/i,  // a. Option or a) Option
    /[1-4][\.\)]\s+\w+/i,  // 1. Option or 1) Option
    /option\s+[a-d]:/i,    // Option A:
    /\b(multiple choice|choose one|select one)\b/i  // Keywords
  ];
  
  // Check if the text contains at least one of the patterns
  return mcPatterns.some(pattern => pattern.test(text));
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getSelectedText') {
    sendResponse({ text: window.getSelection().toString() });
  }
});