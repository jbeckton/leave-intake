# CLAUDE.md - Leave Intake Notebook

## Project Overview

A **LangGraph v1** TypeScript application for building an agentic leave intake wizard. The system handles employee leave requests (FMLA, Pregnancy, etc.) using a state machine pattern with human-in-the-loop interrupts.

## Tech Stack

- **Runtime:** Bun
- **Framework:** LangGraph v1 (`@langchain/langgraph ^1.0.2`)
- **Language:** TypeScript (ES2022, ESNext modules)
- **LLM:** Google Gemini 2.5 Pro (`@langchain/google-genai`)
- **Validation:** Zod v4

## Project Structure

```
src/
├── agent.ts                 # Main graph entry point (WizardState + assistant node)
├── example-1.ts             # Alternative example using MessagesAnnotation
├── common/
│   ├── tools/
│   │   ├── calculator-tool.ts   # Arithmetic operations tool
│   │   ├── weather-tool.ts      # Mock weather API tool
│   │   └── index.ts             # Tool exports
│   └── types/
│       ├── runtime-context.types.ts  # RuntimeContext schema (employeeId, employerId)
│       └── index.ts
└── utils/
    ├── llm-models.ts        # Gemini model initialization (geminiModel export)
    └── getContext.ts        # Extract RuntimeContext from LangGraph config
```

## Commands

```bash
bun run start      # Run the agent
bun run dev        # Watch mode
bun run studio     # Launch LangGraph Studio (pnpx @langchain/langgraph-cli dev)
bun run typecheck  # TypeScript type checking
bun run lint       # ESLint
bun run lint:fix   # ESLint with auto-fix
```

## Environment Variables (.env)

```
GOOGLE_API_KEY=<gemini-api-key>
GOOGLE_GENERATIVE_AI_API_KEY=<gemini-api-key>
LANGSMITH_API_KEY=<optional>
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=<project-name>
```

## Key Files

| File | Purpose |
|------|---------|
| `src/agent.ts` | Main graph: WizardState annotation + assistant node + graph compilation |
| `src/utils/llm-models.ts` | Pre-configured `geminiModel` (temperature=0) |
| `src/common/tools/` | LangChain tool definitions with Zod schemas |
| `src/common/types/` | Shared types including RuntimeContext |
| `langgraph.json` | LangGraph Studio config - registers graph entry points |

## Architecture

### Current Implementation (Simple)

```
START → assistant → END
```

The assistant node:
1. Binds tools to the LLM
2. Invokes the model with conversation history
3. Returns messages to state

### State Management

```typescript
const WizardState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
```

### RuntimeContext

Pass tenant/user context through LangGraph config:

```typescript
interface RuntimeContext {
  employeeId?: string;
  employerId?: string;
}
```

## Code Conventions

1. **Imports:** Use named imports
2. **Tools:** Define in `src/common/tools/`, export from index.ts
3. **Types:** Shared types in `src/common/types/`
4. **LLM:** Use pre-configured `geminiModel` from `src/utils/llm-models.ts`
5. **Nodes:** Async functions with signature `(state, config) => { ... }`
6. **Graph:** Export compiled graph as `graph` for LangGraph Studio

## Adding Features

1. **New Tool:** Create in `src/common/tools/`, export from index.ts, bind in assistant node
2. **New Node:** Add to workflow with `.addNode()`, connect with `.addEdge()`
3. **Expand State:** Modify WizardState annotation (see commented example in agent.ts)

## LangGraph Studio

Configured via `langgraph.json`:
- `agent` → `./src/agent.ts:graph`
- `example_1` → `./src/example-1.ts:graph`

## Documentation Resources

- **Context7 MCP:** Available for up-to-date LangGraph docs
- **llms.txt:** LangChain/LangGraph documentation links
