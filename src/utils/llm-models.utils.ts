import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

/**
 * Initialize the Google Gemini model with default configuration
 */
const createGeminiModel = () => {
  return new ChatGoogleGenerativeAI({
    model: 'gemini-2.5-pro',
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY,
    // Disable streaming to avoid intermittent errors with empty/malformed responses
    // See: https://github.com/langchain-ai/langchainjs/issues/7018
    streaming: false,
  });
}

/**
 * Initialize the OpenAI model with default configuration
 */
const createOpenAIModel = () => {
  return new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Default Gemini model instance
 */
export const geminiModel = createGeminiModel();

/**
 * Default OpenAI model instance
 */
export const openAIModel = createOpenAIModel();
