# Chat Agent

## Overview

The Chat Agent is a conversational AI that handles both general chat interactions and orchestrates the Leave Intake Wizard. It uses a **Subgraph pattern** where the wizard is added as a direct subgraph node, enabling proper checkpointer propagation.

## Architecture

```
Chat Agent Graph (MemorySaver)
├── State: messages[], wizardAction, session, stepPayload, ...
├── Nodes:
│   ├── chatInputRouter → routes based on wizardAction presence
│   ├── chat → conversational AI responses
│   └── wizard → wizard subgraph (no separate checkpointer)
└── Flow: START → router → (chat OR wizard) → END
```

### Checkpointer Propagation

The wizard runs as a **subgraph node** (not manually invoked), which means:
- Parent's checkpointer automatically propagates to subgraph
- Both parent and subgraph state are saved together in ONE checkpoint
- On next invoke, full state (including wizard session) is restored

## Input Formats

The chat agent routes requests based on the presence of `wizardAction`:

- **No `wizardAction`** → Routes to chat node
- **Has `wizardAction`** → Routes to wizard subgraph

---

### 1. Chat Message (No Wizard)

Send a regular chat message to get conversational responses about leave policies, FMLA, etc.

```json
{
  "messages": [
    { "role": "user", "content": "What is FMLA?" }
  ]
}
```

**Response:** AI message explaining FMLA

---

### 2. Initialize Wizard

Start the leave intake wizard to begin collecting leave request information.

```json
{
  "wizardAction": "init"
}
```

**Response:** `stepPayload` containing the first wizard step (leave type selection)

---

### 3. Submit Wizard Step Response

Submit answers to wizard step questions.

```json
{
  "wizardAction": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "pregnancy-adoption" },
    { "questionId": "q-leave-duration", "value": "12_weeks" }
  ]
}
```

**Response:** `stepPayload` containing the next wizard step

---

### 4. Resume Wizard Session

Resume an existing wizard session (uses checkpointed state from thread_id).

```json
{
  "wizardAction": "resume"
}
```

**Response:** `stepPayload` containing the current wizard step

---

### 5. Chat Between Wizard Steps

While in a wizard session, send a chat message without `wizardAction` to ask questions.

```json
{
  "messages": [
    { "role": "user", "content": "What does CFRA mean?" }
  ]
}
```

**Response:** AI message explaining CFRA. Wizard state is preserved via checkpointer.

---

## State Schema

```typescript
ChatAgentState = {
  // Chat-specific
  messages: BaseMessage[]

  // Wizard keys (shared with wizard subgraph)
  wizardAction: 'init' | 'respond' | 'resume' | null
  inputStepId: string | null           // Required for 'respond'
  inputResponses: InputResponse[]      // Required for 'respond'
  responses: Response[]                // Accumulated enriched responses
  session: WizardSession | null
  config: WizardConfig | null
  currentStep: Step | null
  stepRuleResults: Record<string, boolean>
  stepPayload: StepPayload | null
}
```

## Response Structure

### Chat Response

When routed to chat, the response includes an AI message:

```json
{
  "messages": [
    { "role": "user", "content": "What is FMLA?" },
    { "role": "assistant", "content": "FMLA (Family and Medical Leave Act) is..." }
  ],
  "wizardAction": null,
  "stepPayload": null
}
```

### Wizard Response

When routed to wizard, the response includes `stepPayload`:

```json
{
  "messages": [],
  "wizardAction": "init",
  "stepPayload": {
    "step": {
      "stepId": "step-leave-type",
      "sort": 1,
      "name": "leave-type-selection",
      "title": "Leave Type",
      "semanticTag": "INTAKE:STEP:LEAVE_TYPE"
    },
    "elements": [
      {
        "elementId": "el-leave-type",
        "stepId": "step-leave-type",
        "type": "question",
        "sort": 1,
        "isVisible": true,
        "attributes": {
          "questionId": "q-leave-type",
          "semanticTag": "INTAKE:QUESTION:LEAVE_TYPE",
          "componentTypeKey": "select",
          "questionText": "Select your leave type",
          "options": [
            { "optionId": "opt-preg", "sort": 1, "label": "Pregnancy & Adoption", "value": "pregnancy-adoption" },
            { "optionId": "opt-medical", "sort": 2, "label": "Medical Leave", "value": "medical" },
            { "optionId": "opt-family", "sort": 3, "label": "Family Care", "value": "family-care" }
          ],
          "validation": ["required"]
        }
      }
    ],
    "session": {
      "sessionId": "sess-abc123",
      "wizardId": "leave-intake-v1",
      "employeeId": "emp-456",
      "currentStepId": "step-leave-type",
      "status": "in-progress",
      "responses": []
    }
  }
}
```

## Testing in LangGraph Studio

### Graph Selection

Select the `chat` graph in LangGraph Studio (not `wizard`).

### Test Sequence

1. **Initialize wizard:**
   ```json
   { "wizardAction": "init" }
   ```

2. **Submit leave type:**
   ```json
   {
     "wizardAction": "respond",
     "inputStepId": "step-leave-type",
     "inputResponses": [
       { "questionId": "q-leave-type", "value": "pregnancy-adoption" },
       { "questionId": "q-leave-duration", "value": "12_weeks" }
     ]
   }
   ```

3. **Ask a question mid-wizard:**
   ```json
   {
     "messages": [
       { "role": "user", "content": "What is CFRA?" }
     ]
   }
   ```

4. **Continue wizard:**
   ```json
   {
     "wizardAction": "respond",
     "inputStepId": "step-leave-dates",
     "inputResponses": [
       { "questionId": "q-expected-date", "value": "2025-06-15" }
     ]
   }
   ```

## Thread Management

- Use the same `thread_id` in config for an entire conversation
- Both chat messages and wizard state are checkpointed together
- Changing `thread_id` starts a new conversation/wizard session

---

## Wizard Context Tool

The chat agent has access to a `getWizardContext` tool that retrieves the current wizard state. This enables personalized responses based on what the user has already answered.

### When to Use

The LLM automatically calls this tool when it needs context about the user's leave request to answer questions accurately, such as:

- "Am I eligible for CFRA?"
- "What leave type did I select?"
- "What's my next step?"

### Tool Response Structure

```typescript
{
  status: 'not_started' | 'in-progress' | 'completed',
  steps: [
    {
      stepId: string,
      title: string,
      status: 'completed' | 'current' | 'upcoming' | 'conditional',
      condition?: string,  // Rule for conditional steps
      questions: [
        {
          questionId: string,
          questionText: string,
          response: string | null,      // null if unanswered
          responseLabel: string | null  // Human-readable value
        }
      ]
    }
  ]
}
```

### Example

User asks: "Am I eligible for CFRA?"

Chat agent calls `getWizardContext()` and receives:

```json
{
  "status": "in-progress",
  "steps": [
    {
      "stepId": "step-leave-type",
      "title": "Leave Type",
      "status": "completed",
      "questions": [
        {
          "questionId": "q-leave-type",
          "questionText": "Select your leave type",
          "response": "pregnancy-adoption",
          "responseLabel": "Pregnancy & Adoption"
        }
      ]
    },
    {
      "stepId": "step-work-info",
      "title": "Work Information",
      "status": "current",
      "questions": [
        {
          "questionId": "q-work-state",
          "questionText": "In which state do you primarily work?",
          "response": null,
          "responseLabel": null
        }
      ]
    },
    {
      "stepId": "step-cfra",
      "title": "CFRA Eligibility",
      "status": "conditional",
      "condition": "INTAKE:QUESTION:LEAVE_TYPE equals \"pregnancy-adoption\" AND INTAKE:QUESTION:WORK_STATE equals \"CA\"",
      "questions": [...]
    }
  ]
}
```

Chat agent responds: "CFRA eligibility depends on your work state. You've selected Pregnancy & Adoption leave, which qualifies. Once you answer the work state question in the Work Information step, I can confirm - if you work in California, you'll be eligible for CFRA protections."

---

## Key Differences from Wizard Graph

| Aspect | Chat Agent (`chat`) | Wizard Graph (`wizard`) |
|--------|---------------------|-------------------------|
| Input format | `wizardAction` at top level | Same (`wizardAction` at top level) |
| Chat support | Yes | No |
| Use case | Full conversational experience | Direct wizard operations |
| Checkpointing | Single checkpointer for all | Own checkpointer (standalone) |

## Files

| File | Purpose |
|------|---------|
| `src/chat-agent.graph.ts` | Main graph definition |
| `src/state/chat-agent.state.ts` | State schema (merged with wizard keys) |
| `src/nodes/chat-input-router.node.ts` | Routes chat vs wizard |
| `src/nodes/chat-agent.node.ts` | Conversational AI node with tool support |
| `src/tools/get-wizard-context.tool.ts` | Tool for fetching wizard context |
| `src/utils/wizard-context.utils.ts` | Wizard context builder logic |
