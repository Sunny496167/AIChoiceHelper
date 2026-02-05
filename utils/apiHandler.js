// apiHandler.js - API request handling for different providers

import { API_PROVIDERS, QUESTION_TYPE_CONFIG } from './constants.js';
import { parseAPIError, logError } from './errorHandler.js';

/**
 * Build API request configuration for different providers
 * @param {string} provider - API provider name
 * @param {string} apiKey - API key
 * @param {string} text - User's selected text
 * @param {string} questionType - Type of question
 * @returns {Object} { url, headers, body }
 */
export function buildAPIRequest(provider, apiKey, text, questionType) {
    const config = QUESTION_TYPE_CONFIG[questionType];
    const prompt = config.prompt(text);
    const systemMessage = config.systemMessage;
    const maxTokens = config.maxTokens;

    let apiUrl = '';
    let headers = {};
    let requestBody = {};

    switch (provider) {
        case API_PROVIDERS.OPENAI:
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            requestBody = {
                model: 'openai/chatgpt-4o-latest',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens
            };
            break;

        case API_PROVIDERS.GEMINI:
            apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
            headers = {
                'Content-Type': 'application/json'
            };
            apiUrl += `?key=${apiKey}`;
            requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: `${systemMessage}\n\n${prompt}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: maxTokens * 3, // Gemini uses different token counting
                    temperature: 0.2
                }
            };
            break;

        case API_PROVIDERS.DEEPSEEK:
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            requestBody = {
                model: 'deepseek/deepseek-r1:free',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens
            };
            break;

        case API_PROVIDERS.PERPLEXITY:
            apiUrl = 'https://api.perplexity.ai/chat/completions';
            headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            };
            requestBody = {
                model: 'sonar',
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: prompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.2
            };
            break;
    }

    return { url: apiUrl, headers, body: requestBody };
}

/**
 * Call AI API and get response
 * @param {string} provider - API provider name
 * @param {string} apiKey - API key
 * @param {string} text - User's selected text
 * @param {string} questionType - Type of question
 * @returns {Promise<string>} AI response text
 */
export async function callAI(provider, apiKey, text, questionType) {
    const { url, headers, body } = buildAPIRequest(provider, apiKey, text, questionType);

    console.log(`Calling ${provider} API for question type: ${questionType}`);
    console.log(`API URL: ${url.split('?')[0]}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        console.log(`${provider} API Response Status: ${response.status}`);

        if (!response.ok) {
            const error = await parseAPIError(response, provider);
            throw error;
        }

        const data = await response.json();
        console.log(`${provider} API Response:`, JSON.stringify(data));

        return extractResponse(provider, data);

    } catch (error) {
        logError(error, `callAI - ${provider}`);
        throw error;
    }
}

/**
 * Extract response text from API response data
 * @param {string} provider - API provider name
 * @param {Object} data - API response data
 * @returns {string} Extracted response text
 */
function extractResponse(provider, data) {
    let result = '';

    try {
        if (provider === API_PROVIDERS.OPENAI ||
            provider === API_PROVIDERS.DEEPSEEK ||
            provider === API_PROVIDERS.PERPLEXITY) {
            result = data.choices[0].message.content.trim();
        } else if (provider === API_PROVIDERS.GEMINI) {
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
        }

        if (!result) {
            throw new Error('Empty response from AI');
        }

        return result;

    } catch (error) {
        logError(error, `extractResponse - ${provider}`);
        throw error;
    }
}
