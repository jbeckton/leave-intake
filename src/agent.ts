import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, tool } from "langchain";
import * as z from "zod";

// Initialize the Google Gemini model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

// Define a simple weather tool
const getWeather = tool(
  async (input) => {
    return `It's always sunny in ${input.city}!`;
  },
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }
);

// Define another example tool - calculator
const calculator = tool(
  async (input) => {
    const { operation, a, b } = input;
    switch (operation) {
      case "add":
        return `${a} + ${b} = ${a + b}`;
      case "subtract":
        return `${a} - ${b} = ${a - b}`;
      case "multiply":
        return `${a} * ${b} = ${a * b}`;
      case "divide":
        return `${a} / ${b} = ${a / b}`;
      default:
        return "Unknown operation";
    }
  },
  {
    name: "calculator",
    description: "Perform basic arithmetic operations",
    schema: z.object({
      operation: z.enum(["add", "subtract", "multiply", "divide"]),
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

// Create the agent with Google Gemini
const agent = createAgent({
  model,
  tools: [getWeather, calculator],
  systemPrompt: "You are a helpful assistant that can check weather and do calculations.",
});

// Export the graph for LangSmith Studio
export const graph = agent;

// Main function to run the agent (only runs when executed directly)
async function main() {
  console.log("=== Google Gemini Agent Demo ===\n");

  // Example 1: Weather query
  console.log("Query 1: Weather in Tokyo");
  const result1 = await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  });
  console.log("Response:", result1.messages[result1.messages.length - 1].content);
  console.log("\n---\n");

  // Example 2: Calculator
  console.log("Query 2: Math calculation");
  const result2 = await agent.invoke({
    messages: [{ role: "user", content: "What is 25 multiplied by 4?" }],
  });
  console.log("Response:", result2.messages[result2.messages.length - 1].content);
  console.log("\n---\n");

  // Example 3: Combined query
  console.log("Query 3: Combined query");
  const result3 = await agent.invoke({
    messages: [{
      role: "user",
      content: "What's the weather in Paris? Also, what is 100 divided by 5?"
    }],
  });
  console.log("Response:", result3.messages[result3.messages.length - 1].content);
}

// Run the agent only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}