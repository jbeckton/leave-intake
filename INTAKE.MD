# Leave Intake Wizard

## Overview

A stateful, multi-step wizard for employee leave requests (FMLA, Pregnancy, Adoption, etc.). Built with LangGraph for state persistence and human-in-the-loop support.

## Core Concepts

| Concept           | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| **Wizard Config** | Single unified config defining all steps and elements for all leave types       |
| **Step**          | A discrete phase in the wizard containing one or more elements                  |
| **Element**       | A UI component - either interactive (question) or informational (heading, info) |
| **Session**       | Runtime state: current step, collected responses, status                        |
| **Rules Engine**  | LLM-based evaluation of step visibility rules based on user responses           |

## Wizard Config

- **Single unified config** for all leave types (`leave-intake-v1`)
- Steps are ordered but flow is dynamic (driven by rules engine)
- Step visibility is controlled by rules evaluated against responses
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
// WizardConfig - unified config for all leave types
{
    wizardId: 'leave-intake-v1',
    wizardName: 'Leave of Absence Request',
    steps: [
        {
            stepId: 'step-leave-type',
            sort: 1,
            name: 'leave-type-selection',
            title: 'Leave Type',
            semanticTag: 'INTAKE:STEP:LEAVE_TYPE',
            // No rule - always shown as first step
        },
        {
            stepId: 'step-leave-dates',
            sort: 2,
            name: 'leave-dates',
            title: 'Leave Dates',
            semanticTag: 'INTAKE:STEP:LEAVE_DATES',
            rule: 'INTAKE:QUESTION:LEAVE_TYPE is provided',
        },
        {
            stepId: 'step-cfra',
            sort: 4,
            name: 'cfra-eligibility',
            title: 'CFRA Eligibility',
            semanticTag: 'INTAKE:STEP:CFRA',
            rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" AND INTAKE:QUESTION:WORK_STATE equals "CA"',
        },
    ],
    elements: [
        {
            elementId: 'el-leave-type',
            stepId: 'step-leave-type',
            type: 'question',
            sort: 1,
            isVisible: true,
            attributes: {
                questionId: 'q-leave-type',
                semanticTag: 'INTAKE:QUESTION:LEAVE_TYPE',
                componentTypeKey: 'select',
                questionText: 'Select your leave type',
                options: [
                    { optionId: 'opt-preg', sort: 1, label: 'Pregnancy & Adoption', value: 'pregnancy-adoption' },
                    { optionId: 'opt-medical', sort: 2, label: 'Medical Leave', value: 'medical' },
                    { optionId: 'opt-family', sort: 3, label: 'Family Care', value: 'family-care' },
                ],
                validation: ['required'],
            }
        },
        {
            elementId: 'el-expected-date',
            stepId: 'step-leave-dates',
            type: 'question',
            sort: 1,
            isVisible: true,
            attributes: {
                questionId: 'q-expected-date',
                semanticTag: 'INTAKE:QUESTION:EXPECTED_DATE',
                componentTypeKey: 'datePicker',
                questionText: 'What is your expected due date or adoption date?',
                helperText: 'Approximate date is fine.',
                validation: ['required', 'futureDate'],
            }
        },
    ]
}
```

### Session Structure

```typescript
// WizardSession - runtime state (separate from config)
{
    sessionId: 'sess-abc123',
    wizardId: 'leave-intake-v1',
    employeeId: 'emp-456',
    createdAt: '2025-11-29T08:14:23.456Z',
    updatedAt: '2025-11-29T09:30:00.000Z',
    currentStepId: 'step-leave-dates',
    status: 'in-progress',  // 'in-progress' | 'review' | 'completed' | 'abandoned'
    responses: [
        {
            questionId: 'q-leave-type',
            semanticTag: 'INTAKE:QUESTION:LEAVE_TYPE',
            value: 'pregnancy-adoption',
            answeredAt: '2025-11-29T08:15:00.000Z',
        },
        {
            questionId: 'q-expected-date',
            semanticTag: 'INTAKE:QUESTION:EXPECTED_DATE',
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
3. Run rules engine to determine next step (evaluates step visibility rules)
4. Return next step's elements to UI

### Initialize

1. Create wizard session (persisted to database)
2. Load unified wizard config (`leave-intake-v1`)
3. Set current step to first step (leave type selection)

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

| Scenario              | Client Sends                                              | Result                                                |
| --------------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| **New session**       | `invoke({ action: 'init' }, { thread_id: new })`          | Creates session, returns first step payload           |
| **Submit responses**  | `invoke({ action: 'respond', responses }, { thread_id })` | Processes responses, advances step, returns next step |
| **Return to session** | `invoke({ action: 'resume' }, { thread_id })`             | Loads session from state, returns current step        |

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
│  invoke({ action: 'init' }, config)                                │
│                                                                     │
│  START → inputRouter → initSession → prepareStep → END             │
│                                                                     │
│  Returns: { step, elements, session }                              │
│  (First step is always leave type selection)                       │
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
│  (Rules engine evaluates step visibility based on responses)       │
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

// initSession - creates new session with unified config
const initSession = (state, config) => {
  const wizardConfig = loadWizardConfig('leave-intake-v1');
  const session = createSession({
    wizardId: wizardConfig.wizardId,
    employeeId: config.configurable.employeeId,
  });
  session.currentStepId = wizardConfig.steps[0].stepId;
  return {
    session,
    config: wizardConfig,
    currentStep: wizardConfig.steps[0],
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

### 1. Init (New Session)

```json
{ "action": "init" }
```

Creates session and returns Step 1 (leave type selection).

### 2. Respond (Submit Leave Type)

```json
{
  "action": "respond",
  "inputStepId": "step-leave-type",
  "inputResponses": [
    { "questionId": "q-leave-type", "value": "pregnancy-adoption" },
    { "questionId": "q-leave-duration", "value": "12_weeks" }
  ]
}
```

Valid leave types: `pregnancy-adoption`, `medical`, `family-care`

### 3. Respond (Submit Leave Dates)

```json
{
  "action": "respond",
  "inputStepId": "step-leave-dates",
  "inputResponses": [
    { "questionId": "q-expected-date", "value": "2025-06-15" }
  ]
}
```

### 4. Respond (Submit Work Info)

```json
{
  "action": "respond",
  "inputStepId": "step-work-info",
  "inputResponses": [
    { "questionId": "q-work-state", "value": "CA" },
    { "questionId": "q-manager-name", "value": "Jane Smith" }
  ]
}
```

### 5. Respond (Submit CFRA Acknowledgment)

Only shown for California + Pregnancy/Adoption:

```json
{
  "action": "respond",
  "inputStepId": "step-cfra",
  "inputResponses": [
    { "questionId": "q-cfra-acknowledge", "value": "true" }
  ]
}
```

### 6. Resume (Return to Existing Session)

```json
{ "action": "resume" }
```

Use with an existing `thread_id` to return to a paused session.

---

## Rules Engine

The rules engine uses LLM-based evaluation with natural language rules. Rules are defined at the step level and evaluated after each step completion.

### Design Model: Linear + Skip

The wizard follows a **linear flow with conditional skipping**:

1. Steps are ordered by `sort` value
2. Each step can have an optional `rule` (boolean condition)
3. Steps without rules default to `isRulePassed = true`
4. After each step, all future step rules are evaluated in one LLM call
5. The next step is the first future step (by sort order) where `isRulePassed === true`

### Step Schema with Rules

```typescript
{
  stepId: 'step-cfra',
  sort: 4,
  name: 'cfra-eligibility',
  title: 'CFRA Eligibility',
  semanticTag: 'INTAKE:STEP:CFRA',
  rule: 'INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" AND INTAKE:QUESTION:WORK_STATE equals "CA"',
  ruleContext: 'Optional context to help LLM understand complex values',
}
```

### Rule Format

Rules are **simple boolean conditions** - no "Show if" or "Display when" phrasing. The LLM evaluates each rule to `true` or `false`.

**Examples:**
```
INTAKE:QUESTION:WORK_STATE equals "CA"
INTAKE:QUESTION:LEAVE_TYPE is provided
INTAKE:QUESTION:LEAVE_TYPE equals "pregnancy-adoption" AND INTAKE:QUESTION:WORK_STATE equals "CA"
INTAKE:QUESTION:BENEFITS contains "dental"
INTAKE:QUESTION:COVERAGE_TYPES has "vision"
```

**Supported operators (natural language):**
- `equals` / `is` - exact match
- `contains` / `has` - for multi-select values (JSON arrays)
- `is provided` / `is not empty` - value exists
- `AND` / `OR` - boolean logic
- Comparisons: `greater than`, `less than`, `within X days`

### Response Context Format

Responses are passed to the LLM as a simple key-value map using semantic tags as keys:

```json
{
  "INTAKE:QUESTION:LEAVE_TYPE": "pregnancy-adoption",
  "INTAKE:QUESTION:EXPECTED_DATE": "2025-06-15",
  "INTAKE:QUESTION:WORK_STATE": "CA",
  "INTAKE:QUESTION:BENEFITS": "[\"medical\",\"dental\",\"vision\"]"
}
```

Values can be simple strings, JSON arrays/objects, CSV, or any format - the LLM interprets based on context.

### Rule Context (Optional)

The `ruleContext` field provides additional context for complex value formats:

```typescript
{
  rule: 'INTAKE:QUESTION:BENEFITS contains "dental"',
  ruleContext: 'INTAKE:QUESTION:BENEFITS is a JSON array like ["medical","dental","vision"]',
}
```

### Semantic Tags

Semantic tags create an unambiguous bridge between rules and data:

```
INTAKE:QUESTION:LEAVE_TYPE
  │       │          │
  │       │          └── Field name
  │       └── Element type (STEP, QUESTION, etc.)
  └── Wizard namespace (INTAKE for leave intake wizard)
```

**Where tags live:**
- `step.semanticTag` - Reference steps in routing rules
- `element.attributes.semanticTag` - Reference elements in visibility rules
- `response.semanticTag` - Copied from question, enables rule matching without lookups

### LLM Evaluation

The `determineNextStep` node uses `.withStructuredOutput()` for reliable parsing:
1. Gets all future steps (sort > current step's sort)
2. Sets `isRulePassed = true` for steps without rules
3. Calls LLM with structured output schema for steps with rules
4. Returns the first step (by sort) where `isRulePassed === true`

**Example LLM Prompt:**
```
You are evaluating boolean conditions based on user responses.

## User Responses
{
  "INTAKE:QUESTION:LEAVE_TYPE": "pregnancy-adoption",
  "INTAKE:QUESTION:WORK_STATE": "CA"
}

## Rules to Evaluate
- stepId: "step-cfra"
  rule: "INTAKE:QUESTION:LEAVE_TYPE equals 'pregnancy-adoption' AND INTAKE:QUESTION:WORK_STATE equals 'CA'"

- stepId: "step-ny-pfl"
  rule: "INTAKE:QUESTION:WORK_STATE equals 'NY'"

Return ONLY valid JSON array, no explanation.
```

**Example LLM Response (via structured output):**
```json
[
  { "stepId": "step-cfra", "isRulePassed": true },
  { "stepId": "step-ny-pfl", "isRulePassed": false }
]
```

---

## Future Enhancements

Deferred until core wizard flow is stable:

- **Dynamic content generation:** Some informational elements require backend processing (searches against user's benefits/enrollments, LLM summarization) during the "Prepare step elements" phase
- **Frontend display rules:** Generate visibility logic (data structures or scripts) that the UI executes client-side when users interact with elements (e.g., hide question B when question A = "No")
