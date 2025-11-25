import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Initialize the Google Gemini model with default configuration
 */
export function createGeminiModel() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY,
  });
}

/**
 * Default Gemini model instance
 */
export const geminiModel = createGeminiModel();
