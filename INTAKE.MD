# Leave Intake Wizard

## Overview

A stateful, multi-step wizard for employee leave requests (FMLA, Pregnancy, Adoption, etc.). Built with LangGraph for state persistence and human-in-the-loop support.

**Initial Implementation:** Pregnancy & Adoption leave type.

## Core Concepts

| Concept           | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| **Wizard Config** | Static definition of steps and elements for a leave type                        |
| **Step**          | A discrete phase in the wizard containing one or more elements                  |
| **Element**       | A UI component - either interactive (question) or informational (heading, info) |
| **Session**       | Runtime state: current step, collected responses, status                        |

## Wizard Config

- One config per Leave Type
- Steps are ordered but flow is dynamic (driven by rules engine)
- Elements have visibility rules (always visible or conditional)

### Element Types

> **Note:** Element types are tentative. `question`, `info`, and `document` are confirmed; others TBD.

| Type           | Interactive | Description                            |
| -------------- | ----------- | -------------------------------------- |
| `question`     | Yes         | Collects user response, has validation |
| `info`         | No          | Informational callout/alert            |
| `document`     | No          | Download link for a document/form      |
| *(others TBD)* |             | e.g., heading, divider, etc.           |

### Config Structure

```typescript
// WizardConfig - static definition
{
    wizardId: 'preg-adoption-v1',
    wizardName: 'Pregnancy & Adoption',
    steps: [
        {
            stepId: 'step-001',
            sort: 1,
            name: 'leave-dates',
            title: 'Leave Dates',
            semanticTag: 'PREG:STEP:LEAVE_DATES',
        }
    ],
    elements: [
        {
            elementId: 'el-001',
            stepId: 'step-001',  // Direct reference to owning step
            type: 'question',
            sort: 1,
            isVisible: true,  // or rule reference for conditional visibility
            attributes: {
                questionId: 'q-expected-date',
                semanticTag: 'PREG:QUESTION:EXPECTED_DATE',
                componentTypeKey: 'datePicker',  // maps to UI component
                questionText: 'What is your expected due date?',
                helperText: 'Approximate date is fine.',
                validation: ['required', 'futureDate'],
            }
        },
        {
            elementId: 'el-002',
            stepId: 'step-001',
            type: 'question',
            sort: 2,
            isVisible: true,
            attributes: {
                questionId: 'q-leave-duration',
                semanticTag: 'PREG:QUESTION:LEAVE_DURATION',
                componentTypeKey: 'select',
                questionText: 'How long do you plan to take leave?',
                options: [
                    { optionId: 'opt-1', sort: 1, label: '6 weeks', value: '6_weeks' },
                    { optionId: 'opt-2', sort: 2, label: '8 weeks', value: '8_weeks' },
                    { optionId: 'opt-3', sort: 3, label: '12 weeks', value: '12_weeks' },
                ],
                validation: ['required'],
            }
        }
    ]
}
```

### Session Structure

```typescript
// WizardSession - runtime state (separate from config)
{
    sessionId: 'sess-abc123',
    wizardId: 'preg-adoption-v1',
    employeeId: 'emp-456',
    createdAt: '2025-11-29T08:14:23.456Z',
    updatedAt: '2025-11-29T09:30:00.000Z',
    currentStepId: 'step-001',
    status: 'in-progress',  // 'in-progress' | 'review' | 'completed' | 'abandoned'
    responses: [
        {
            questionId: 'q-expected-date',
            semanticTag: 'PREG:QUESTION:EXPECTED_DATE',
            value: '2025-06-15',
            answeredAt: '2025-11-29T08:20:00.000Z',
        }
    ]
}
```


## Wizard Flow

The Intake Wizard Agent manages the wizard flow. On each user submission:
1. Validate responses
2. Update wizard session state
3. Run rules engine to determine next step
4. Return next step's elements to UI

### Initialize

1. Create wizard session (persisted to database)
2. Load default wizard config with initial step (leave type + dates)
3. On leave type selection → load leave-specific wizard config into agent state


### Loop

```
User submits responses
    ↓
Agent validates + updates session
    ↓
Rules engine determines next step
    ↓
Prepare step elements for UI
    ↓
Agent returns step payload to UI
    ↓
(repeat until complete)
```

**Human-in-the-Loop:** Sessions can be paused and resumed hours or days later using a session reference. The checkpointer handles state persistence automatically.

---

## LangGraph Implementation

The wizard uses a **router-based architecture** where each invocation runs the graph to completion. The checkpointer persists state between calls using `thread_id`.

### Invocation Patterns

| Scenario              | Client Sends                                               | Result                                                |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| **New session**       | `invoke({ action: 'init', wizardId }, { thread_id: new })` | Creates session, returns first step payload           |
| **Submit responses**  | `invoke({ action: 'respond', responses }, { thread_id })`  | Processes responses, advances step, returns next step |
| **Return to session** | `invoke({ action: 'resume' }, { thread_id })`              | Loads session from state, returns current step        |

### Graph Structure (Router + Multi-Node)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Nodes                                                               │
│  ─────                                                               │
│  inputRouter      → Routes to appropriate path based on action       │
│  initSession      → Creates session, loads config, sets first step   │
│  loadSession      → Loads existing session from checkpointed state   │
│  processResponses → Validates responses, updates session state       │
│  rulesEngine      → Subgraph: determines next step from rules        │
│  prepareStep      → Reads state, builds step payload for UI          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Graph Flow                                                          │
│                                                                      │
│  START → inputRouter ─┬─[init]───→ initSession ──────→ prepareStep → END
│                       │                                              │
│                       ├─[respond]→ processResponses → rulesEngine ───┤
│                       │                                              │
│                       └─[resume]─→ loadSession ──────────────────────┘
└──────────────────────────────────────────────────────────────────────┘
```

### Request/Response Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. New Session                                                     │
│  invoke({ action: 'init', wizardId: 'preg-adoption-v1' }, config)  │
│                                                                     │
│  START → inputRouter → initSession → prepareStep → END             │
│                                                                     │
│  Returns: { step, elements, session }                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                      UI renders step
                      User fills form
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  2. Submit Responses                                                │
│  invoke({ action: 'respond', responses: [...] }, config)           │
│                                                                     │
│  START → inputRouter → processResponses → rulesEngine → prepareStep → END
│                                                                     │
│  Returns: { step, elements, session }                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                          (repeat)

┌─────────────────────────────────────────────────────────────────────┐
│  3. Resume (user returns later)                                     │
│  invoke({ action: 'resume' }, config)                              │
│                                                                     │
│  START → inputRouter → loadSession → prepareStep → END             │
│                                                                     │
│  Returns: { step, elements, session }                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Router-Based (No Interrupt)?

| Aspect               | Benefit                                               |
| -------------------- | ----------------------------------------------------- |
| **Simpler model**    | Each call is a complete request/response cycle        |
| **Easier testing**   | Test in LangGraph Studio with different action inputs |
| **Explicit routing** | Clear which nodes execute for each action             |
| **Same persistence** | Checkpointer preserves state via `thread_id`          |
| **Extensible**       | Easy to add new actions/paths as features grow        |

### Node Implementations

```typescript
// inputRouter - routes based on action in input
const inputRouter = (state) => {
  switch (state.action) {
    case 'init': return 'initSession';
    case 'respond': return 'processResponses';
    case 'resume': return 'loadSession';
    default: throw new Error(`Unknown action: ${state.action}`);
  }
}

// initSession - creates new session
const initSession = (state) => {
  const session = createSession(state.wizardId);
  const config = loadWizardConfig(state.wizardId);
  return {
    session,
    config,
    currentStep: config.steps[0],
  };
}

// loadSession - for resume, session already in checkpointed state
const loadSession = (state) => {
  // State already has session from checkpoint
  // Just pass through to prepareStep
  return {};
}

// processResponses - validates and updates session
const processResponses = (state) => {
  const validated = validateResponses(state.responses, state.currentStep);
  const updatedSession = addResponsesToSession(state.session, validated);
  return { session: updatedSession };
}

// prepareStep - builds payload for UI (always runs last)
const prepareStep = (state) => {
  const elements = getStepElements(state.config, state.currentStep);
  return {
    stepPayload: {
      step: state.currentStep,
      elements,
      session: state.session,
    }
  };
}
```

### State Shape

```typescript
const WizardState = Annotation.Root({
  // Input
  action: Annotation<'init' | 'respond' | 'resume'>(),
  wizardId: Annotation<string | null>(),
  responses: Annotation<Response[]>(),

  // Session
  session: Annotation<WizardSession | null>(),
  config: Annotation<WizardConfig | null>(),
  currentStep: Annotation<Step | null>(),

  // Output
  stepPayload: Annotation<StepPayload | null>(),
});
```

---

## Testing in LangGraph Studio

Use these JSON payloads to test the wizard flow. Each invocation requires a `thread_id` in the config for state persistence.

### 1. Init (First Call - Shows Leave Type Selector)

```json
{ "action": "init" }
```

Returns the leave-type-selector wizard with a dropdown of leave types.

### 2. Init (Select Leave Type - Creates Session)

```json
{
  "action": "init",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "pregnancy-adoption" },
    { "questionId": "q-leave-duration", "value": "12_weeks" }
  ]
}
```

Valid values: `pregnancy-adoption`, `medical`, `family-care`

Creates session and returns Step 1 of the selected wizard.

### 3. Respond (Submit Step 1 Answers)

```json
{
  "action": "respond",
  "inputStepId": "step-001",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-06-15" }
  ]
}
```

### 4. Respond (Submit Step 2 Answers)

```json
{
  "action": "respond",
  "inputStepId": "step-002",
  "inputResponses": [
    { "questionId": "q-work-state", "value": "CA" },
    { "questionId": "q-manager-name", "value": "Jane Smith" }
  ]
}
```

### 5. Resume (Return to Existing Session)

```json
{ "action": "resume" }
```

Use with an existing `thread_id` to return to a paused session.

### Invalid Leave Type (Loops Back to Selector)

```json
{
  "action": "init",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "invalid-type" }
  ]
}
```

Returns the leave-type-selector again since the value is invalid.

---

## Rules Engine

The rules engine uses LLM-based evaluation with natural language rules. No prescribed rule syntax - whatever works best for rule authors.

### Design Principles

| Aspect        | Approach                                 |
| ------------- | ---------------------------------------- |
| Rule language | Natural language, format-agnostic        |
| Semantic tags | Colon-delimited, namespaced identifiers  |
| Validation    | Rules must reference valid semantic tags |
| Output        | Structured (next step semantic tag)      |

### Semantic Tags

Semantic tags create an unambiguous bridge between rules and data:

```
PREG:QUESTION:EXPECTED_DATE
 │      │          │
 │      │          └── Field name
 │      └── Element type (STEP, QUESTION, etc.)
 └── Wizard/Leave type
```

**Where tags live:**
- `step.semanticTag` - Reference steps in routing rules
- `element.attributes.semanticTag` - Reference elements in visibility rules. Only question type elements need a semanticTag
- `response.semanticTag` - Copied from question, enables rule matching without lookups

### Rule Examples

Rules are natural language, using semantic tags for precision:

```
When PREG:QUESTION:WORK_STATE is California
and PREG:QUESTION:LEAVE_TYPE is Pregnancy
then after PREG:STEP:LEAVE_DATES go to PREG:STEP:CFRA_ELIGIBILITY
```

```
When PREG:QUESTION:EXPECTED_DATE is within 60 days
and PREG:QUESTION:WEEKS_EMPLOYED is more than 52
then go to PREG:STEP:FMLA_ELIGIBILITY
```

The LLM handles date math, numeric comparisons, and boolean logic natively.

### Context for Rules Evaluation

The rules engine receives:
- Current step (semantic tag)
- All session responses (semantic tag → value)
- Available next steps (from wizard config with semantic tags)
- The rule set for this wizard

### Testing

Rule authors need a testing interface to:
1. Write/edit rules
2. Provide sample session data
3. See LLM decision + reasoning
4. Iterate until correct

Same people who configure wizards also write rules - they own both the semantic vocabulary and the rule content.

---

## Future Enhancements

Deferred until core wizard flow is stable:

- **Dynamic content generation:** Some informational elements require backend processing (searches against user's benefits/enrollments, LLM summarization) during the "Prepare step elements" phase
- **Frontend display rules:** Generate visibility logic (data structures or scripts) that the UI executes client-side when users interact with elements (e.g., hide question B when question A = "No")
