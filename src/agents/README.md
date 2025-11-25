# Agents Guide

This directory contains all agent implementations for the project. This guide explains how to create, configure, and manage agents.

## Table of Contents

1. [Agent Types](#agent-types)
2. [Creating a New Agent](#creating-a-new-agent)
3. [Entry Points vs Sub-Agents](#entry-points-vs-sub-agents)
4. [Adding Entry Points](#adding-entry-points)
5. [Removing Entry Points](#removing-entry-points)
6. [Multi-Agent Patterns](#multi-agent-patterns)
7. [API Routing](#api-routing)

## Agent Types

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

## Creating a New Agent

### Step 1: Create the Agent File

Create a new file in `src/agents/` (e.g., `my-agent.ts`):

```typescript
import { createAgent } from "langchain";
import { geminiModel } from "../utils/models";
import { myTool1, myTool2 } from "../tools";

/**
 * My Agent - Description of what this agent does
 */
export function createMyAgent() {
  const agent = createAgent({
    model: geminiModel,
    tools: [myTool1, myTool2],
    systemPrompt: "You are a helpful assistant that...",
  });

  return agent;
}

// Export graph if this will be an entry point agent
export const graph = createMyAgent();
```

### Step 2: Create Tools (if needed)

Create tool files in `src/tools/`:

```typescript
// src/tools/my-tool.ts
import { tool } from "langchain";
import * as z from "zod";

export const myTool = tool(
  async (input) => {
    // Tool logic here
    return `Result for ${input.param}`;
  },
  {
    name: "my_tool",
    description: "What this tool does",
    schema: z.object({
      param: z.string().describe("Parameter description"),
    }),
  }
);
```

Don't forget to export from `src/tools/index.ts`:

```typescript
export { myTool } from "./my-tool";
```

## Entry Points vs Sub-Agents

### Entry Point Agent Example

**File:** `src/agents/supervisor.ts`

```typescript
import { createAgent, tool } from "langchain";
import { geminiModel } from "../utils/models";
import { createIntakeAgent } from "./intake-agent";
import { createApprovalAgent } from "./approval-agent";

// Create sub-agents
const intakeAgent = createIntakeAgent();
const approvalAgent = createApprovalAgent();

// Wrap sub-agents as tools
const intakeTool = tool(
  async (input) => await intakeAgent.invoke(input),
  {
    name: "process_intake",
    description: "Process leave intake request",
    schema: z.object({
      request: z.string().describe("The leave request details"),
    }),
  }
);

const approvalTool = tool(
  async (input) => await approvalAgent.invoke(input),
  {
    name: "approve_leave",
    description: "Approve leave request",
    schema: z.object({
      requestId: z.string().describe("The request ID to approve"),
    }),
  }
);

// Supervisor coordinates sub-agents
export function createSupervisorAgent() {
  return createAgent({
    model: geminiModel,
    tools: [intakeTool, approvalTool],
    systemPrompt: "You are a leave intake coordinator...",
  });
}

// Export as entry point
export const graph = createSupervisorAgent();
```

**Register in `langgraph.json`:**

```json
{
  "graphs": {
    "leave_intake": "./src/agents/supervisor.ts:graph"
  }
}
```

### Sub-Agent Example

**File:** `src/agents/intake-agent.ts`

```typescript
import { createAgent } from "langchain";
import { geminiModel } from "../utils/models";

export function createIntakeAgent() {
  return createAgent({
    model: geminiModel,
    tools: [],
    systemPrompt: "You process leave intake requests...",
  });
}

// NO graph export - this is a sub-agent only
```

## Adding Entry Points

### Method 1: Add New Entry Point (Independent Agent)

**Step 1:** Create agent file with `graph` export

```typescript
// src/agents/analytics.ts
export const graph = createAnalyticsAgent();
```

**Step 2:** Add to `langgraph.json`

```json
{
  "graphs": {
    "leave_intake": "./src/agent.ts:graph",
    "analytics": "./src/agents/analytics.ts:graph"  // ADD THIS
  }
}
```

**Step 3:** Restart dev server

```bash
npm run studio
```

**Step 4:** Verify in Studio - Both agents appear in dropdown

### Method 2: Add Sub-Agent to Existing Entry Point

**Step 1:** Create agent file WITHOUT `graph` export

```typescript
// src/agents/notification-agent.ts
export function createNotificationAgent() {
  return createAgent({...});
}
// NO graph export
```

**Step 2:** Import and use as tool in supervisor

```typescript
// src/agents/supervisor.ts
import { createNotificationAgent } from "./notification-agent";

const notificationAgent = createNotificationAgent();

const notifyTool = tool(
  async (input) => await notificationAgent.invoke(input),
  { name: "send_notification", description: "..." }
);
```

**No changes needed to `langgraph.json`** - sub-agent is internal only

## Removing Entry Points

### Step 1: Remove from `langgraph.json`

```json
{
  "graphs": {
    "leave_intake": "./src/agent.ts:graph"
    // "old_agent": "./src/agents/old.ts:graph"  // REMOVE THIS LINE
  }
}
```

### Step 2: Restart dev server

```bash
npm run studio
```

### Step 3: Verify

- Agent no longer appears in Studio dropdown
- Assistant no longer accessible via API

**Note:** You can keep the agent file in `src/agents/` if it's used as a sub-agent.

## Multi-Agent Patterns

### Pattern 1: Supervisor (Tool Calling)

**Best for:** Structured workflows, centralized control

**Characteristics:**
- Single entry point coordinates specialized sub-agents
- Sub-agents wrapped as tools
- Supervisor decides which sub-agent to invoke
- Sub-agents return results to supervisor

**When to use:**
- Clear workflow (intake → approval → notification)
- Need centralized orchestration
- Simpler API surface for clients

**Example:** Leave intake system with supervisor coordinating intake, approval, and notification agents

### Pattern 2: Handoffs (Independent Agents)

**Best for:** Multi-domain conversations, specialist takeover

**Characteristics:**
- Multiple entry point agents
- Agents can transfer control to each other
- User interacts directly with active agent
- Each agent is a domain specialist

**When to use:**
- Multiple independent domains (HR, IT, Finance)
- Need direct access to specific agents
- Want agents to hand off control to peers

**Example:** Customer service with billing, technical support, and account management specialists

### Pattern 3: Hybrid (Recommended)

**Combines both patterns:**
- Top-level agents use handoffs for domain switching
- Each top-level agent uses tool calling for internal sub-agents

**Example:**
```
├── HR Agent (entry point)
│   ├── Leave Intake Sub-Agent
│   ├── Benefits Sub-Agent
├── IT Agent (entry point)
│   ├── Access Request Sub-Agent
│   ├── Equipment Sub-Agent
```

## API Routing

### How It Works

When you define graphs in `langgraph.json`:

```json
{
  "graphs": {
    "leave_intake": "./src/agents/supervisor.ts:graph",
    "analytics": "./src/agents/analytics.ts:graph"
  }
}
```

**What happens:**
1. LangGraph Server reads the config on startup
2. **Automatically creates a default "assistant" for each graph**
3. Each assistant gets a unique `assistant_id`
4. Each assistant is linked to its `graph_id` (the key in config)

### Invoking Agents via API

**There is NO explicit router** - routing happens via the `assistant_id`:

```typescript
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://localhost:2024" });

// 1. Get available assistants (auto-created for each graph)
const assistants = await client.assistants.search();

// 2. Find specific assistant by graph_id
const leaveAgent = assistants.find(a => a.graph_id === "leave_intake");
const analyticsAgent = assistants.find(a => a.graph_id === "analytics");

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
- `graph_id`: Static identifier in langgraph.json (e.g., "leave_intake")
- `assistant_id`: Runtime instance ID auto-created by server
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
  { graph_id: "analytics", assistant_id: "asst_def456" }
]
```

## Quick Reference Checklist

### To add an entry point:
- [ ] Create agent file in `src/agents/`
- [ ] Export `graph` from the file
- [ ] Add entry to `langgraph.json` under `graphs`
- [ ] Restart dev server (`npm run studio`)
- [ ] Verify in Studio dropdown

### To add a sub-agent:
- [ ] Create agent file in `src/agents/`
- [ ] Export factory function (e.g., `createMyAgent()`)
- [ ] DO NOT export `graph`
- [ ] Import and use in parent agent as tool
- [ ] No changes to `langgraph.json`

### To remove an entry point:
- [ ] Remove entry from `langgraph.json`
- [ ] Restart dev server
- [ ] Optionally keep file as sub-agent

### To invoke via API:
- [ ] Get assistants: `client.assistants.search()`
- [ ] Find by `graph_id`
- [ ] Use `assistant_id` in run calls

## Best Practices

1. **Start Simple**: Begin with Pattern 1 (Supervisor) for most projects
2. **Shared Utilities**: Use `src/utils/` for shared model configs and state types
3. **Reusable Tools**: Create tools in `src/tools/` that can be shared across agents
4. **Clear Naming**: Use descriptive names for agents and tools
5. **Documentation**: Add comments explaining each agent's purpose
6. **Testing**: Create test entry points for sub-agents when needed
7. **Context Engineering**: Control what information each agent sees via prompts and tool metadata

## Examples in This Project

- **`demo-agent.ts`**: Simple agent with weather and calculator tools
  - Entry point agent (exported in langgraph.json)
  - Demonstrates basic agent structure
  - Good template for creating new agents

## Next Steps

Ready to build your leave intake system? Start by:

1. Creating specialized sub-agents (intake, approval, notification)
2. Building a supervisor agent that coordinates them
3. Defining shared state types in `src/utils/state.ts`
4. Creating domain-specific tools in `src/tools/`

See the main `README.md` for more information on the overall project structure.
