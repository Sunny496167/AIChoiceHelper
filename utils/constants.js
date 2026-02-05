// constants.js - Centralized constants for the extension

// Default settings
export const DEFAULT_SETTINGS = {
  apiProvider: 'openai',
  notificationOpacity: 0.9,
  notificationPosition: 'center',
  questionType: 'mcq',
  displayDuration: 3,
  openaiKey: '',
  geminiKey: '',
  deepseekKey: '',
  perplexityKey: ''
};

// Notification positions
export const POSITIONS = {
  CENTER: 'center',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right'
};

// Question types
export const QUESTION_TYPES = {
  MCQ: 'mcq',
  EXPLAIN: 'explain',
  SHORT_ANSWER: 'short-answer',
  LONG_ANSWER: 'long-answer',
  WORD_MEANING: 'word-meaning'
};

// Question type configurations
export const QUESTION_TYPE_CONFIG = {
  [QUESTION_TYPES.MCQ]: {
    label: 'Multiple Choice Question',
    prompt: (text) => `The following is a multiple choice question with options. Please respond with ONLY the best answer in the format "a: [option]" (just the letter and the selected option, nothing else): ${text}`,
    systemMessage: 'You are a helpful assistant that answers multiple choice questions. Always respond with ONLY the letter and selected option, nothing else.',
    maxTokens: 50
  },
  [QUESTION_TYPES.EXPLAIN]: {
    label: 'Explain',
    prompt: (text) => `Explain the following concept clearly and concisely:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that explains concepts clearly and concisely.',
    maxTokens: 300
  },
  [QUESTION_TYPES.SHORT_ANSWER]: {
    label: 'Short Answer (30 words)',
    prompt: (text) => `Answer the following question in exactly 30 words or less:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that provides concise answers. Always limit your response to 30 words or less.',
    maxTokens: 100
  },
  [QUESTION_TYPES.LONG_ANSWER]: {
    label: 'Long Answer (70 words)',
    prompt: (text) => `Provide a detailed answer to the following question in approximately 70 words:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that provides detailed answers. Aim for approximately 70 words in your response.',
    maxTokens: 200
  },
  [QUESTION_TYPES.WORD_MEANING]: {
    label: 'Word Meaning & Explanation',
    prompt: (text) => `Define and explain the meaning of the following word or phrase:\n\n${text}`,
    systemMessage: 'You are a helpful assistant that defines and explains word meanings clearly.',
    maxTokens: 150
  }
};

// API Providers
export const API_PROVIDERS = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  DEEPSEEK: 'deepseek',
  PERPLEXITY: 'perplexity'
};

// Error messages
export const ERROR_MESSAGES = {
  NO_API_KEY: (provider) => `Please set ${provider} API key in extension settings`,
  NO_SELECTION: 'Please select some text first',
  API_ERROR: (provider, message) => `${provider} API error: ${message}`,
  INVALID_API_KEY: (provider) => `Invalid ${provider} API key. Please check your settings.`,
  INSUFFICIENT_BALANCE: (provider) => `${provider} account has insufficient balance. Please add credits to your account.`,
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

// Notification styles base
export const NOTIFICATION_BASE_STYLE = {
  position: 'fixed',
  padding: '5px 9px',
  fontSize: '16px',
  fontWeight: 'normal',
  color: '#5f5e5e',
  zIndex: '2147483647',
  transition: 'opacity 0.3s ease-in-out',
  fontFamily: 'monospace',
  maxWidth: '80%',
  wordWrap: 'break-word'
};
