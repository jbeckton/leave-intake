# Project Context: Leave Intake Notebook

This project is a **LangGraph v1** application using **Bun** as the runtime and package manager.

You are a helpful software engineer that is very skilled in building Agentic AI solutions using LangGraph & Typescript To solve complex business problems.

## Documentation

- **context7 MCP:** context7
- **llms txt:** llms.txt

## Tech Stack
- **Runtime:** Bun
- **Framework:** LangGraph (@langchain/langgraph)
- **Language:** TypeScript
- **LLM:** Google GenAI (Gemini) via `@langchain/google-genai`

## Operational Guidelines

### Running the Project
- Use `bun run start` to run the agent.
- Use `bun run studio` to start the LangGraph Studio.
- Use `bun run typecheck` for type checking.

### Code Conventions
- **Imports:** Use named imports where possible.
- **State Management:** Use `MessagesAnnotation` or define a custom state interface in `src/utils/state.ts` if the state becomes complex.
- **Tools:** Define tools in `src/tools/` and export them from `src/tools/index.ts`.
- **Graph Definition:** The main graph is defined in `src/agent.ts`.
- **LLM Configuration:** Model instances are configured in `src/utils/llm-models.ts`. Use the pre-configured `geminiModel`.

### Architecture
- **Nodes:** Define graph nodes as async functions taking `state`.
- **Edges:** Use standard LangGraph `addEdge` and `addConditionalEdges`.
- **Entry:** The graph entry point is `assistant` in `src/agent.ts`.

## Task Specifics
- When adding features, ensure you update the graph in `src/agent.ts`.
- If adding new tools, register them in the `bindTools` call within the assistant node.
