# Leave Intake POC

A simple LangChain agent project using Google Gemini models with Bun runtime.

## Notebooks

The Deno install is for the notebooks, we are not using Deno for the agent runtime

## Features

- **Google Gemini AI** - Uses `gemini-2.0-flash-exp` model for intelligent responses
- **Tool Calling** - Agent can use tools to perform specific tasks:
  - Weather tool - Get weather information for cities
  - Calculator tool - Perform basic arithmetic operations
- **Bun Runtime** - Fast JavaScript/TypeScript runtime for optimal performance
- **Modern LangChain v1** - Uses the latest `createAgent` API
- **LangSmith Studio** - Visual debugging and development interface for agents

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Google API key for Gemini (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
- LangSmith API key (get one from [LangSmith](https://smith.langchain.com/))

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:

Create a `.env` file in the root directory with your API keys:
```bash
GOOGLE_API_KEY=your_google_api_key_here

# LangSmith Configuration (for Studio and tracing)
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=gemini-agent-dev
```

## Usage

### Run the agent once:
```bash
bun run start
```

### Run with auto-reload (development mode):
```bash
bun run dev
```

### Run directly:
```bash
bun run src/agent.ts
```

### Launch LangSmith Studio (Visual Development Interface):
```bash
npm run studio
```

This will start a local Agent Server and open LangSmith Studio in your browser at `https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`

Studio allows you to:
- Visualize agent execution step-by-step
- Test different inputs interactively
- Inspect tool calls and their results
- Debug agent behavior in real-time
- View traces and execution history

### Chat with Your Agent (Interactive UI):

For a full chat interface, use the [Agent Chat UI](https://docs.langchain.com/oss/javascript/langchain/ui). After starting the Agent Server with `npm run studio`, you can connect to it using the official Agent Chat UI for a conversational experience.

## Project Structure

```
leave-intake-poc/
├── src/
│   └── agent.ts          # Main agent implementation
├── .env                  # Environment variables (not in git)
├── langgraph.json        # LangGraph CLI configuration
├── package.json          # Project dependencies and scripts
└── README.md            # This file
```

## Example Usage

The agent can handle multiple types of queries:

**Weather Query:**
```
User: What's the weather in Tokyo?
Agent: It's always sunny in Tokyo!
```

**Math Calculation:**
```
User: What is 25 multiplied by 4?
Agent: 25 multiplied by 4 is 100.
```

**Combined Query:**
```
User: What's the weather in Paris? Also, what is 100 divided by 5?
Agent: The weather in Paris is sunny. And 100 divided by 5 is 20.
```

## Adding Custom Tools

To add your own tools, edit `src/agent.ts`:

```typescript
const myTool = tool(
  async (input) => {
    // Your tool logic here
    return `Result: ${input.param}`;
  },
  {
    name: "my_tool",
    description: "Description of what your tool does",
    schema: z.object({
      param: z.string().describe("Description of the parameter"),
    }),
  }
);

// Add to the agent
const agent = createAgent({
  model,
  tools: [getWeather, calculator, myTool], // Add your tool here
  systemPrompt: "You are a helpful assistant.",
});
```

## Technologies Used

- [LangChain](https://js.langchain.com/) - Framework for building AI agents
- [Google Gemini](https://ai.google.dev/) - Large language model
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Zod](https://zod.dev/) - TypeScript-first schema validation
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

## License

ISC
