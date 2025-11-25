import { createAgent } from "langchain";
import { geminiModel } from "../utils/models.js";


export function createIntakeAgent() {
  const agent = createAgent({
    model: geminiModel,
    tools: [],
    systemPrompt: "You are a helpful assistant that can help users navigate and complete their intake request.",
  });

  return agent;
}

/**
 * Export the graph for LangGraph configuration
 * This allows the agent to be registered as an entry point in langgraph.json
 */
export const graph = createIntakeAgent();
