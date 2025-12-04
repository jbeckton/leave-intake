# Implementation Plan: Chat Agent with Wizard Tool Integration

## Overview
Implement a chat agent using the **Tool Calling pattern** that wraps the existing wizard graph as a tool. The chat agent handles conversational interactions while delegating wizard operations to the wizard tool.

## Key Decisions
- **Pattern**: Tool Calling (NOT handoffs)
- **Message Format**: Explicit metadata distinguishes chat vs wizard inputs (no LLM inference)
- **Thread Management**: Single thread_id for entire conversation (chat + wizard state)
- **Output Format**: Return raw StepPayload unchanged for UI rendering
- **Tool Invocation**: Explicit `{ "action": "init" }` triggers wizard initialization

## Architecture

```
Chat Agent Graph (Parent)
├── State: messages[], wizardToolResult
├── Nodes:
│   ├── inputRouter → routes based on message format
│   ├── chatNode → conversational AI responses
│   └── wizardToolNode → invokes wizard graph as function
└── Wizard remains standalone, callable as tool or independently
```

## Input Message Formats

### 1. Regular Chat Message
```json
{
  "messages": [
    { "role": "user", "content": "What is FMLA?" }
  ]
}
```
Routes to: `chatNode`

### 2. Initialize Wizard
```json
{
  "messages": [
    { "role": "user", "content": "[User requested to start wizard]" }
  ],
  "wizardInput": {
    "action": "init"
  }
}
```
Routes to: `wizardToolNode`

### 3. Submit Wizard Step Response
```json
{
  "messages": [
    { "role": "user", "content": "[User submitted step response]" }
  ],
  "wizardInput": {
    "action": "respond",
    "inputStepId": "step-leave-type",
    "inputResponses": [
      { "questionId": "q-leave-type", "value": "pregnancy-adoption" }
    ]
  }
}
```
Routes to: `wizardToolNode`

### 4. Resume Wizard Session
```json
{
  "messages": [
    { "role": "user", "content": "[User returning to wizard]" }
  ],
  "wizardInput": {
    "action": "resume"
  }
}
```
Routes to: `wizardToolNode`

## State Schema

```typescript
ChatAgentState = Annotation.Root({
  // Input
  messages: Annotation<BaseMessage[]>({
    reducer: messagesReducer,
    default: () => []
  }),

  wizardInput: Annotation<{
    action: 'init' | 'respond' | 'resume';
    inputStepId?: string;
    inputResponses?: InputResponse[];
  } | null>({
    reducer: (_, new) => new,
    default: () => null
  }),

  // Output
  stepPayload: Annotation<StepPayload | null>({
    reducer: (_, new) => new,
    default: () => null
  })
})
```

## Implementation Steps

### 1. Create Chat Agent State Schema
**File**: `src/state/chat-agent.state.ts`

- Define state with messages, wizardInput, stepPayload
- Use messagesReducer for message accumulation
- Replace reducer for wizardInput (not accumulate)

### 2. Create Input Router Node
**File**: `src/nodes/chat-input-router.node.ts`

```typescript
const chatInputRouter = (state: ChatAgentStateType): 'chat' | 'wizardTool' => {
  // If wizardInput present, route to wizard tool
  if (state.wizardInput?.action) {
    return 'wizardTool';
  }
  // Otherwise, route to chat
  return 'chat';
}
```

### 3. Create Chat Node
**File**: `src/nodes/chat-agent.node.ts`

- Import openAIModel (NOT geminiModel)
- System prompt: "You are a helpful HR assistant..."
- Invoke model with conversation history
- Return messages only (no stepPayload)
- Do NOT bind tools to this node (wizard is invoked via routing, not LLM tool calling)

### 4. Create Wizard Tool Node
**File**: `src/nodes/wizard-tool.node.ts`

- Import existing wizard graph from `src/agent.ts`
- Extract wizardInput from state
- Transform to wizard graph input format:
  ```typescript
  {
    action: wizardInput.action,
    inputStepId: wizardInput.inputStepId || null,
    inputResponses: wizardInput.inputResponses || []
  }
  ```
- Invoke wizard graph: `await wizardGraph.invoke(input, config)`
- Extract stepPayload from result
- Return:
  ```typescript
  {
    stepPayload: result.stepPayload,
    wizardInput: null  // Clear after processing
  }
  ```

### 5. Build Chat Agent Graph
**File**: `src/chat-agent.graph.ts`

```typescript
const workflow = new StateGraph(ChatAgentState, RuntimeContextSchema)
  .addNode('chat', chatNode)
  .addNode('wizardTool', wizardToolNode)
  .addConditionalEdges(START, chatInputRouter, {
    chat: 'chat',
    wizardTool: 'wizardTool'
  })
  .addEdge('chat', END)
  .addEdge('wizardTool', END);

export const chatAgentGraph = workflow.compile({
  checkpointer: new MemorySaver()
});
```

### 6. Update langgraph.json
**File**: `langgraph.json`

Add chat agent graph:
```json
{
  "graphs": {
    "chat": "./src/chat-agent.graph.ts:chatAgentGraph",
    "wizard": "./src/agent.ts:graph",
    ...
  }
}
```

### 7. Export Node Index (Optional)
**File**: `src/nodes/index.ts`

Add exports for new nodes:
```typescript
export { chatInputRouter } from './chat-input-router.node.js';
export { chatNode } from './chat-agent.node.js';
export { wizardToolNode } from './wizard-tool.node.js';
```

## Testing in LangGraph Studio

### Test 1: Pure Chat Interaction
```json
{
  "messages": [
    { "role": "user", "content": "What is FMLA?" }
  ]
}
```
**Expected**: Chat response explaining FMLA, no stepPayload

### Test 2: Initialize Wizard
```json
{
  "messages": [
    { "role": "user", "content": "I need to request leave" }
  ],
  "wizardInput": {
    "action": "init"
  }
}
```
**Expected**: stepPayload with first step (leave type selection)

### Test 3: Submit Step Response
```json
{
  "messages": [
    { "role": "user", "content": "I selected pregnancy leave" }
  ],
  "wizardInput": {
    "action": "respond",
    "inputStepId": "step-leave-type",
    "inputResponses": [
      { "questionId": "q-leave-type", "value": "pregnancy-adoption" }
    ]
  }
}
```
**Expected**: stepPayload with next step (leave dates)

### Test 4: Chat Between Wizard Steps
```json
{
  "messages": [
    { "role": "user", "content": "What does CFRA mean?" }
  ]
}
```
**Expected**: Chat response explaining CFRA, stepPayload unchanged from previous

### Test 5: Resume After Chat
```json
{
  "messages": [
    { "role": "user", "content": "Continue wizard" }
  ],
  "wizardInput": {
    "action": "resume"
  }
}
```
**Expected**: stepPayload with current wizard step

## Critical Files to Modify/Create

### New Files
1. `src/state/chat-agent.state.ts` - State schema
2. `src/nodes/chat-input-router.node.ts` - Router logic
3. `src/nodes/chat-agent.node.ts` - Chat AI node
4. `src/nodes/wizard-tool.node.ts` - Wizard invocation node
5. `src/chat-agent.graph.ts` - Main graph

### Modified Files
1. `langgraph.json` - Add chat agent graph entry
2. `src/nodes/index.ts` - Export new nodes (optional)

### Unchanged Files
- `src/agent.ts` - Wizard graph remains standalone
- `src/state/wizard-state.ts` - No changes needed
- All existing wizard nodes - No changes needed

## Checkpointer Behavior

**Question**: Both wizard and chat have checkpointers. How does this work with the same thread_id?

**Answer**:
- Chat agent graph has its own checkpointer (`new MemorySaver()`)
- Wizard graph ALSO has its own checkpointer (`new MemorySaver()`)
- When wizard is invoked from `wizardToolNode`, it uses the SAME `thread_id` passed through config
- LangGraph handles nested checkpoint scoping automatically
- Result: Both graphs checkpoint to the same thread, but maintain separate state namespaces
- On resume: Chat agent loads chat state, wizard loads wizard state from same thread
- **This works because**: Each graph has its own state schema, so no collision

**Key Point**: Pass the config through when invoking wizard:
```typescript
const result = await wizardGraph.invoke(wizardInput, config);
//                                                      ^^^^^^
//                                  Same config with thread_id
```

This ensures wizard checkpoints are associated with the same thread as the chat agent.

## Key Design Principles

1. **Wizard remains standalone**: Can be used independently or as a tool
2. **Single thread**: All state (chat + wizard) persists in one checkpoint via config propagation
3. **Explicit routing**: No LLM inference for wizard tool invocation
4. **Raw stepPayload**: UI receives unchanged wizard output
5. **Clean separation**: Chat concerns vs wizard concerns isolated
6. **State clarity**: wizardInput present = wizard route, absent = chat route
7. **Config propagation**: Always pass config to wizard invocation for thread_id continuity

## Benefits of This Approach

- ✅ Simple state management (single graph, single checkpoint)
- ✅ Clear intent (wizardInput presence = wizard invocation)
- ✅ Chat naturally handles questions between wizard steps
- ✅ Wizard reusable (standalone or as tool)
- ✅ No complex phase tracking or handoff logic
- ✅ Easy to extend with more tools later
- ✅ Message history preserved across chat and wizard interactions

## Edge Cases Handled

1. **User asks question mid-wizard**: Routes to chat, wizard state preserved
2. **Multiple wizard sessions**: thread_id distinguishes different conversations
3. **Wizard completion**: stepPayload indicates completion, chat can handle next steps
4. **Resume after pause**: Resume action reloads wizard state from checkpoint

## Future Enhancements (Out of Scope)

- LLM intent detection to auto-invoke wizard (if desired later)
- Additional tools for benefits lookup, document search, etc.
- Streaming support for chat responses
- Tool result formatting/summarization for chat context
