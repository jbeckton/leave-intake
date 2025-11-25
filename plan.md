# Multi-Agent Project Structure Plan

## Overview
Restructure the current single-agent project to support multiple agents with a clear separation between entry point agents and sub-agents, including comprehensive documentation on API routing and managing entry points.

## Current State
```
leave-intake-poc/
├── src/
│   └── agent.ts          # Single agent with tools
├── .env
├── langgraph.json
├── package.json
└── README.md
```

## Proposed Structure
```
leave-intake-poc/
├── src/
│   ├── agents/                    # All agent implementations
│   │   ├── demo-agent.ts          # Current demo agent (entry point)
│   │   └── README.md              # How to add/remove agents & entry points
│   ├── tools/                     # Shared tools
│   │   ├── weather-tool.ts        # Weather checking tool
│   │   ├── calculator-tool.ts     # Calculator tool
│   │   └── index.ts               # Tool exports
│   ├── utils/                     # Shared utilities
│   │   ├── models.ts              # Model configurations
│   │   ├── prompts.ts             # Shared prompts
│   │   └── state.ts               # Shared state types
│   └── agent.ts                   # Main entry point (imports agents)
├── .env
├── langgraph.json                 # Configuration
├── package.json
└── README.md                      # Updated documentation
```

## Implementation Steps

### 1. Create New Folder Structure
- Create `src/agents/` directory
- Create `src/tools/` directory
- Create `src/utils/` directory

### 2. Refactor Existing Code

#### Move Tools to `src/tools/`
- Extract weather tool to `src/tools/weather-tool.ts`
- Extract calculator tool to `src/tools/calculator-tool.ts`
- Create `src/tools/index.ts` for convenient imports

#### Create Agent File
- Move agent logic to `src/agents/demo-agent.ts`
- Export a factory function: `createDemoAgent()`
- Keep current functionality intact

#### Update Main Entry Point (`src/agent.ts`)
- Import `createDemoAgent` from agents
- Export `graph` for langgraph.json
- Keep main() function for direct execution

#### Create Utilities
- `src/utils/models.ts` - Model configuration (Gemini setup)
- `src/utils/state.ts` - Shared state type definitions (for future agents)

### 3. Update Documentation

#### Create `src/agents/README.md`
Document:
- How to create a new agent (sub-agent vs entry point)
- **How to add entry points to langgraph.json**
- **How to remove entry points**
- **API routing explanation**
- **How threads work across multiple agents**
- Examples of both supervisor and independent patterns
- API invocation examples

#### Update Main `README.md`
Add new sections:
- **Multi-Agent Architecture** section
- **API Routing** - How to invoke different agents
- Explain project structure
- Show how to add new agents
- Link to `src/agents/README.md`

### 4. Configuration
- Keep `langgraph.json` unchanged (single entry point for now)
- Document how to add multiple graphs later as needed

## Key Principles

### Entry Point Agents
- **Exported in `langgraph.json`** under the `graphs` object
- **Accessible via API** at `http://localhost:2024`
- **LangGraph Server automatically creates an "assistant"** for each graph
- **Invoked via `assistant_id`** in API calls
- Example: Main supervisor, standalone services

### Sub-Agents
- **Regular TypeScript exports** (NOT in langgraph.json)
- **Imported and used by entry point agents**
- Can be invoked as tools or subgraphs
- Not directly accessible via API
- Example: Specialized workers, domain-specific agents

## API Routing Explained

### How It Works

When you define multiple graphs in `langgraph.json`:

```json
{
  "graphs": {
    "leave_intake": "./src/agents/leave-intake.ts:graph",
    "approval": "./src/agents/approval.ts:graph"
  }
}
```

**What happens:**
1. LangGraph Server starts and reads the config
2. **Automatically creates a default "assistant" for each graph**
3. Each assistant gets a unique `assistant_id`
4. Each assistant is linked to its `graph_id` (the key in your config)

### Invoking Agents via API

**There is NO explicit router** - routing happens via the `assistant_id` parameter:

```typescript
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://localhost:2024" });

// 1. Get available assistants (auto-created for each graph)
const assistants = await client.assistants.search();

// 2. Find the specific assistant by graph_id
const leaveAgent = assistants.find(a => a.graph_id === "leave_intake");
const approvalAgent = assistants.find(a => a.graph_id === "approval");

// 3. Create a thread for the conversation
const thread = await client.threads.create();

// 4. Invoke specific agent using assistant_id
await client.runs.stream(
  thread.thread_id,
  leaveAgent.assistant_id,  // <-- THIS routes to the correct graph
  {
    input: { messages: [{ role: "human", content: "I need 5 days off" }] }
  }
);
```

### Key Concepts

**graph_id vs assistant_id:**
- `graph_id`: The identifier in langgraph.json (e.g., "leave_intake")
- `assistant_id`: The runtime instance ID auto-created by the server
- Multiple assistants can reference the same graph_id with different configs

**Threads are NOT tied to a single agent:**
- ✅ You can run **multiple different agents on the same thread**
- ✅ Each agent can see the previous agent's state/checkpoints
- ✅ This enables **agent handoff** patterns

**Example - Agent Handoff:**
```typescript
const thread = await client.threads.create();

// First agent processes intake
await client.runs.wait(thread.thread_id, intakeAgent.assistant_id, {
  input: { request: "I need 5 days off" }
});

// Second agent approves (can see intake state!)
await client.runs.wait(thread.thread_id, approvalAgent.assistant_id, {
  input: {}  // Can access previous agent's state
});
```

## Multi-Agent Patterns

### Pattern 1: Supervisor (Recommended for Leave Intake)

**Single entry point** that coordinates sub-agents:

```json
// langgraph.json - Only supervisor exposed
{
  "graphs": {
    "leave_intake": "./src/agent.ts:graph"
  }
}
```

```typescript
// src/agent.ts - Entry point
import { createIntakeAgent } from "./agents/intake-agent";
import { createApprovalAgent } from "./agents/approval-agent";

// Create sub-agents (NOT in langgraph.json)
const intakeAgent = createIntakeAgent();
const approvalAgent = createApprovalAgent();

// Wrap sub-agents as tools
const intakeTool = tool(
  async (input) => await intakeAgent.invoke(input),
  { name: "process_intake", description: "Process leave intake request" }
);

const approvalTool = tool(
  async (input) => await approvalAgent.invoke(input),
  { name: "approve_leave", description: "Approve leave request" }
);

// Main supervisor
const supervisor = createAgent({
  model,
  tools: [intakeTool, approvalTool, otherTools],
  systemPrompt: "You are a leave intake coordinator..."
});

export const graph = supervisor;
```

**Benefits:**
- Single API endpoint
- Intelligent routing by the supervisor
- Centralized control
- Simpler for clients

### Pattern 2: Independent Entry Points

**Multiple exposed agents** for direct access:

```json
// langgraph.json - Multiple entry points
{
  "graphs": {
    "leave_intake_supervisor": "./src/agents/supervisor.ts:graph",
    "approval_only": "./src/agents/approval-agent.ts:graph",
    "analytics": "./src/agents/analytics-agent.ts:graph"
  }
}
```

**Benefits:**
- Direct access to specific agents
- Useful for testing
- Can invoke agents independently
- Different clients can use different agents

**When to use:**
- Need direct access to sub-agents for testing
- Different services need different agents
- Want flexibility to invoke agents independently

## Adding and Removing Entry Points

### Adding an Entry Point

**Step 1: Create the agent file**
```typescript
// src/agents/my-new-agent.ts
import { createAgent, tool } from "langchain";

export function createMyNewAgent() {
  const agent = createAgent({
    model,
    tools: [...],
    systemPrompt: "You are..."
  });

  return agent;
}

// Export graph for langgraph.json
export const graph = createMyNewAgent();
```

**Step 2: Add to langgraph.json**
```json
{
  "graphs": {
    "existing_agent": "./src/agent.ts:graph",
    "my_new_agent": "./src/agents/my-new-agent.ts:graph"  // ADD THIS
  }
}
```

**Step 3: Restart the dev server**
```bash
npm run studio
```

**Step 4: Verify in Studio**
- Studio will show a dropdown with both agents
- New assistant is auto-created with graph_id "my_new_agent"

### Removing an Entry Point

**Step 1: Remove from langgraph.json**
```json
{
  "graphs": {
    "existing_agent": "./src/agent.ts:graph"
    // "removed_agent": "./src/agents/removed.ts:graph"  // REMOVE THIS
  }
}
```

**Step 2: Restart the dev server**
```bash
npm run studio
```

**Step 3: Verify**
- Agent no longer appears in Studio
- Assistant is no longer accessible via API

**Note:** You can keep the agent file in `src/agents/` if it's used as a sub-agent.

### Testing Entry Points

**List all available assistants:**
```typescript
const assistants = await client.assistants.search();
console.log(assistants.map(a => ({
  graph_id: a.graph_id,
  assistant_id: a.assistant_id
})));
```

**Output:**
```
[
  { graph_id: "leave_intake", assistant_id: "asst_abc123" },
  { graph_id: "approval", assistant_id: "asst_def456" }
]
```

## Studio UI Behavior

When you have multiple entry points:
- **Dropdown/selector** appears to choose which agent to interact with
- Each agent has its own graph visualization
- Can switch between agents while developing
- Each agent can have separate threads

When you have a single entry point (supervisor):
- Only one agent in the dropdown
- Sub-agents appear as nodes in the graph visualization
- Simpler UI experience

## Benefits

1. **Scalability**: Easy to add new agents without clutter
2. **Reusability**: Shared tools and utilities across agents
3. **Clarity**: Clear separation between entry points and sub-agents
4. **Testability**: Each agent can be tested independently or as entry point
5. **Flexibility**: Support both supervisor and independent patterns
6. **API Control**: Choose what to expose via API

## Breaking Changes
- None! The current single agent will continue to work
- This is purely a refactor for better organization
- All existing functionality preserved

## Recommended Approach for Leave Intake Project

**Start with Pattern 1 (Supervisor):**
- Single entry point: `leave_intake`
- Sub-agents: intake, approval, notification (internal)
- Simpler API surface
- Can add direct entry points later if needed

**Later, optionally add testing entry points:**
```json
{
  "graphs": {
    "leave_intake": "./src/agent.ts:graph",           // Main
    "test_approval": "./src/agents/approval.ts:graph", // For testing
    "test_intake": "./src/agents/intake.ts:graph"      // For testing
  }
}
```

## Files to Create/Modify

### New Files
- `src/agents/demo-agent.ts`
- `src/agents/README.md` (comprehensive guide)
- `src/tools/weather-tool.ts`
- `src/tools/calculator-tool.ts`
- `src/tools/index.ts`
- `src/utils/models.ts`
- `src/utils/state.ts`

### Modified Files
- `src/agent.ts` (refactored to import from agents)
- `README.md` (add multi-agent section + API routing section)

### Unchanged Files
- `langgraph.json` (keep as-is for now)
- `package.json` (no changes needed)
- `.env` (no changes needed)

## Next Steps
1. Review this plan
2. Confirm approach
3. Execute refactoring
4. Test to ensure everything works
5. Ready to add new agents as needed!

## Quick Reference: Entry Points Checklist

**To add an entry point:**
- [ ] Create agent file in `src/agents/`
- [ ] Export `graph` from the file
- [ ] Add entry to `langgraph.json` under `graphs`
- [ ] Restart dev server (`npm run studio`)
- [ ] Verify in Studio dropdown

**To remove an entry point:**
- [ ] Remove entry from `langgraph.json`
- [ ] Restart dev server
- [ ] Optionally keep file as sub-agent

**To invoke via API:**
- [ ] Get assistants: `client.assistants.search()`
- [ ] Find by `graph_id`
- [ ] Use `assistant_id` in run calls
