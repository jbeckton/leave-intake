import { createAgent } from "langchain";
import { geminiModel } from "../utils/models.js";
import { getWeather, calculator } from "../tools/index.js";

/**
 * Demo Agent - Example agent with weather and calculator tools
 *
 * This agent demonstrates the basic structure of an agent in this project.
 * It can be used as a template for creating new agents.
 */
export function createDemoAgent() {
  const agent = createAgent({
    model: geminiModel,
    tools: [getWeather, calculator],
    systemPrompt: "You are a helpful assistant that can check weather and do calculations.",
  });

  return agent;
}

/**
 * Export the graph for LangGraph configuration
 * This allows the agent to be registered as an entry point in langgraph.json
 */
export const graph = createDemoAgent();
