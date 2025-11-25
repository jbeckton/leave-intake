import { createDemoAgent } from "./agents/demo-agent.js";

/**
 * Main entry point for the agent application
 *
 * This file imports and exports the primary agent(s) for the application.
 * The exported `graph` is used by LangGraph CLI (langgraph.json) to register
 * the agent as an entry point accessible via the API.
 */

// Create the intake agent instance
const agent = createDemoAgent();

// Export the graph for LangSmith Studio and API access
export const graph = agent;

/**
 * Main function to run the agent (only runs when executed directly)
 *
 * This demonstrates how to invoke the agent programmatically.
 * When running via `bun run src/agent.ts`, this will execute.
 * When running via LangGraph Studio, only the exported `graph` is used.
 */
async function main() {
  console.log("=== Google Gemini Agent Demo ===\n");

  // Example 1: Weather query
  console.log("Query 1: Weather in Tokyo");
  const result1 = await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  });
  console.log("Response:", result1.messages[result1.messages.length - 1].content);
  console.log();

  // Example 2: Calculator
  console.log("Query 2: Math calculation");
  const result2 = await agent.invoke({
    messages: [{ role: "user", content: "What is 25 multiplied by 4?" }],
  });
  console.log("Response:", result2.messages[result2.messages.length - 1].content);
  console.log();

  // Example 3: Combined query
  console.log("Query 3: Combined weather and math");
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
