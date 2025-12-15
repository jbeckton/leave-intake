# Agent Chat UI Architecture Documentation

## Overview

The `apps/chat-ui` is a Next.js 15 app (App Router) that provides a chat interface for LangGraph agents. It handles message streaming, thread management, interrupt handling, and supports custom generative UI components.

---

## Directory Structure

```
apps/chat-ui/src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main entry (uses providers)
│   └── api/[..._path]/         # API passthrough proxy to LangGraph
│       └── route.ts            # initApiPassthrough() for proxying requests
├── components/
│   ├── thread/
│   │   ├── index.tsx           # Main Thread component (message list + input form)
│   │   ├── messages/
│   │   │   ├── ai.tsx          # AI message + custom components + interrupts
│   │   │   ├── human.tsx       # Human message display
│   │   │   ├── generic-interrupt.tsx  # Generic interrupt fallback UI (table view)
│   │   │   ├── tool-calls.tsx  # Tool execution display
│   │   │   └── shared.tsx      # BranchSwitcher, CommandBar utilities
│   │   ├── agent-inbox/        # HITL (Human-In-The-Loop) interrupt UI
│   │   │   ├── index.tsx       # ThreadView - renders HITL interrupts
│   │   │   ├── components/
│   │   │   │   ├── thread-actions-view.tsx  # Approve/reject/edit UI
│   │   │   │   ├── inbox-item-input.tsx     # Form for decisions
│   │   │   │   └── state-view.tsx           # Displays thread state
│   │   │   ├── hooks/
│   │   │   │   └── use-interrupted-actions.tsx
│   │   │   ├── types.ts        # HITLRequest, Decision types
│   │   │   └── utils.ts        # Decision building utilities
│   │   ├── artifact.tsx        # Artifact panel system (right sidebar)
│   │   ├── markdown-text.tsx   # Markdown rendering
│   │   └── history/            # Thread history sidebar
│   └── ui/                     # Shadcn/ui components
├── providers/
│   ├── Stream.tsx              # useStream hook + StreamProvider
│   └── Thread.tsx              # useThreads hook + ThreadProvider
├── hooks/
│   └── use-file-upload.tsx     # File upload handling
└── lib/
    ├── agent-inbox-interrupt.ts  # isAgentInboxInterruptSchema()
    └── utils.ts
```

---

## Core Flow: How Messages & Interrupts Work

### 1. Stream Provider (`src/providers/Stream.tsx`)

The heart of the app. Uses `useStream` from `@langchain/langgraph-sdk/react`:

```typescript
type StateType = { messages: Message[]; ui?: UIMessage[] };

const streamValue = useTypedStream({
  apiUrl,
  assistantId,
  threadId,
  streamMode: ["values"],
  streamSubgraphs: true,
  streamResumable: true,        // Enables interrupt/resume
  onCustomEvent: (event, options) => {
    // Handle UIMessage events for generative UI
    if (isUIMessage(event) || isRemoveUIMessage(event)) {
      options.mutate((prev) => {
        const ui = uiMessageReducer(prev.ui ?? [], event);
        return { ...prev, ui };
      });
    }
  },
});
```

**Key Properties Available via `useStreamContext()`:**
- `stream.messages` - All messages in thread
- `stream.values` - Full graph state (`{ messages, ui?, ...custom }`)
- `stream.interrupt` - Current interrupt data (if any)
- `stream.isLoading` - Boolean loading state
- `stream.submit(input, options)` - Send input or resume interrupt
- `stream.stop()` - Cancel execution

### 2. Message Rendering Flow (`src/components/thread/index.tsx`)

```
Thread component
  |
messages.map() -> HumanMessage | AssistantMessage
  |
AssistantMessage (ai.tsx)
  |-- MarkdownText (content)
  |-- ToolCalls (if any)
  |-- CustomComponent  <-- YOUR GENERATIVE UI HOOKS IN HERE
  +-- Interrupt
        |-- ThreadView (if HITL schema)
        +-- GenericInterruptView (fallback)
```

### 3. Interrupt Detection (`src/components/thread/messages/ai.tsx:76-99`)

Two paths for interrupt rendering:

```typescript
function Interrupt({ interrupt, isLastMessage, hasNoAIOrToolMessages }) {
  return (
    <>
      {/* Path 1: HITL Schema -> Full agent-inbox UI */}
      {isAgentInboxInterruptSchema(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) && (
          <ThreadView interrupt={interrupt} />
        )}

      {/* Path 2: Any other interrupt -> Generic table view */}
      {interrupt && !isAgentInboxInterruptSchema(interrupt) &&
        (isLastMessage || hasNoAIOrToolMessages) ? (
          <GenericInterruptView interrupt={fallbackValue} />
        ) : null}
    </>
  );
}
```

### 4. HITL Schema Validation (`src/lib/agent-inbox-interrupt.ts`)

For `ThreadView` to render (with approve/reject/edit buttons), interrupt must match:

```typescript
interface HITLRequest {
  action_requests: ActionRequest[];  // { name, args, description? }
  review_configs: ReviewConfig[];    // { action_name, allowed_decisions[] }
}

// Our wizard interrupt currently does NOT match this schema
// So it falls through to GenericInterruptView (table display)
```

---

## Where to Add Custom Generative UI

### Option A: CustomComponent System (Push UI)

Already built-in! The app loads external components from `state.ui[]`:

**Location:** `src/components/thread/messages/ai.tsx:18-44`

```typescript
function CustomComponent({ message, thread }) {
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id,
  );

  return customComponents?.map((customComponent) => (
    <LoadExternalComponent
      key={customComponent.id}
      stream={thread}
      message={customComponent}
      meta={{ ui: customComponent, artifact }}
    />
  ));
}
```

**To Use:** Emit `UIMessage` events from your agent via `onCustomEvent`. But this requires agent-side push and doesn't fit the wizard interrupt pattern.

---

### Option B: Custom Interrupt Handler (Recommended for Wizard)

**Our wizard interrupt does NOT match `HITLRequest` schema**, so it renders as `GenericInterruptView` (a table).

**To build wizard forms, we need to:**

1. **Create a custom interrupt detector** (like `isAgentInboxInterruptSchema`)
2. **Create a custom wizard form component**
3. **Hook into the Interrupt component in ai.tsx**

---

## Key Integration Points for Wizard UI

### File 1: `src/lib/agent-inbox-interrupt.ts`

Add a new schema checker for wizard interrupts:

```typescript
// NEW: Check if interrupt is wizard step payload
export function isWizardInterrupt(value: unknown): value is { value: WizardStepPayload } {
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj?.value) return false;
  const payload = obj.value;
  return (
    payload.step?.stepId &&
    Array.isArray(payload.elements) &&
    payload.session?.sessionId
  );
}
```

### File 2: `src/components/thread/messages/ai.tsx` (lines 76-99)

Modify `Interrupt` component to check wizard schema first:

```typescript
function Interrupt({ interrupt, ... }) {
  return (
    <>
      {/* NEW: Wizard interrupt -> Custom wizard form */}
      {isWizardInterrupt(interrupt) && (isLastMessage || hasNoAIOrToolMessages) && (
        <WizardStepForm interrupt={interrupt} />
      )}

      {/* Existing HITL path */}
      {isAgentInboxInterruptSchema(interrupt) && !isWizardInterrupt(interrupt) && ...}

      {/* Fallback generic */}
      {interrupt && !isAgentInboxInterruptSchema(interrupt) && !isWizardInterrupt(interrupt) && ...}
    </>
  );
}
```

### File 3: Create `src/components/thread/wizard/` (NEW)

```
wizard/
├── index.tsx            # WizardStepForm entry point
├── WizardStepForm.tsx   # Main form component
├── elements/            # Element renderers by componentTypeKey
│   ├── SelectInput.tsx
│   ├── DatePicker.tsx
│   ├── TextInput.tsx
│   ├── CheckboxGroup.tsx
│   └── InfoCard.tsx
├── types.ts             # StepPayload, Element types (mirror from agent)
└── utils.ts             # Validation, component mapping
```

### File 4: WizardStepForm Component Pattern

```typescript
import { useStreamContext } from "@/providers/Stream";

export function WizardStepForm({ interrupt }) {
  const stream = useStreamContext();
  const payload = interrupt.value;  // { step, elements, session }
  const [responses, setResponses] = useState<Record<string, any>>({});

  const handleSubmit = () => {
    const inputResponses = Object.entries(responses).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    // Resume interrupt with Command
    stream.submit(
      {},
      {
        command: {
          resume: inputResponses,  // Our wizard expects this format
        },
      }
    );
  };

  return (
    <div className="wizard-form">
      <h2>{payload.step.title}</h2>
      {payload.elements.map(element => {
        const Component = componentMap[element.attributes.componentTypeKey];
        return (
          <Component
            key={element.elementId}
            {...element.attributes}
            value={responses[element.attributes.questionId]}
            onChange={(v) => setResponses(prev => ({
              ...prev,
              [element.attributes.questionId]: v
            }))}
          />
        );
      })}
      <Button onClick={handleSubmit}>Continue</Button>
    </div>
  );
}

const componentMap = {
  'select': SelectInput,
  'datePicker': DatePicker,
  'text': TextInput,
  'checkbox': CheckboxGroup,
  'infoCard': InfoCard,
};
```

---

## Key Patterns to Follow

### 1. Resuming Interrupts

```typescript
const stream = useStreamContext();

// Resume with Command (wizard pattern)
stream.submit(
  {},                              // No new messages
  {
    command: {
      resume: inputResponses,      // Your data
    },
  }
);

// Or for HITL pattern (approve/reject/edit)
stream.submit(
  {},
  {
    command: {
      resume: { decisions: [...] },
    },
  }
);
```

### 2. Accessing Current State

```typescript
const stream = useStreamContext();
const currentInterrupt = stream.interrupt;           // The interrupt object
const interruptValue = stream.interrupt?.value;      // Your stepPayload
const fullState = stream.values;                     // { messages, ui, ...custom }
```

### 3. Using Artifact Panel (Side Display)

```typescript
import { useArtifact } from "../artifact";

function MyComponent() {
  const [ArtifactContent, artifact] = useArtifact();

  return (
    <>
      <button onClick={() => artifact.setOpen(true)}>Show Details</button>
      <ArtifactContent title="Step Details">
        <pre>{JSON.stringify(payload.session, null, 2)}</pre>
      </ArtifactContent>
    </>
  );
}
```

---

## Summary: Where to Make Changes

| Goal | File | What to Do |
|------|------|------------|
| Detect wizard interrupt | `src/lib/agent-inbox-interrupt.ts` | Add `isWizardInterrupt()` |
| Render wizard form | `src/components/thread/messages/ai.tsx` | Add third condition in `Interrupt` component |
| Wizard form component | `src/components/thread/wizard/` (new) | Create form with element mapping |
| Element components | `src/components/thread/wizard/elements/` | Create Select, DatePicker, etc. |
| Type definitions | `src/components/thread/wizard/types.ts` | Mirror StepPayload, Element from agent |

---

## Our Wizard Interrupt Payload (Reference)

```json
{
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
      "type": "question",
      "attributes": {
        "componentTypeKey": "select",
        "questionId": "q-leave-type",
        "questionText": "Select your leave type",
        "options": [
          { "label": "Pregnancy & Adoption", "value": "pregnancy-adoption" },
          { "label": "Medical Leave", "value": "medical" },
          { "label": "Family Care", "value": "family-care" }
        ],
        "validation": ["required"]
      }
    },
    {
      "elementId": "el-leave-duration",
      "type": "question",
      "attributes": {
        "componentTypeKey": "select",
        "questionId": "q-leave-duration",
        "questionText": "How long do you plan to take leave?",
        "options": [
          { "label": "6 weeks", "value": "6_weeks" },
          { "label": "8 weeks", "value": "8_weeks" },
          { "label": "12 weeks", "value": "12_weeks" }
        ],
        "validation": ["required"]
      }
    }
  ],
  "session": {
    "sessionId": "sess-xxx",
    "wizardId": "leave-intake-v1",
    "status": "in-progress",
    "responses": []
  }
}
```

---

## Available UI Libraries

The Chat UI already includes these libraries you can leverage:

- **Shadcn/ui components** - `src/components/ui/` (Button, Input, Label, Switch, etc.)
- **Tailwind CSS** - Full utility classes available
- **Framer Motion** - For animations
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **React Markdown** - Markdown rendering
