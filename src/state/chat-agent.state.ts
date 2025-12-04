import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import type {
  WizardAction,
  InputResponse,
  Response,
  WizardSession,
  WizardConfig,
  Step,
  StepPayload,
} from '../schemas/wizard.types.js';

/**
 * Chat Agent State
 *
 * Manages conversational interactions and wizard subgraph.
 * Wizard keys are shared directly (not wrapped) to enable proper
 * checkpointer propagation when wizard runs as a subgraph.
 */
export const ChatAgentState = Annotation.Root({
  // Chat-specific: messages from user
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),

  // Wizard keys (shared with wizard subgraph)
  // Input (from invoke) - UI submits minimal InputResponse
  wizardAction: Annotation<WizardAction | null>({
    reducer: (_, newValue) => newValue ?? null,
    default: () => null,
  }),
  inputStepId: Annotation<string | null>({
    reducer: (_, newValue) => newValue ?? null,
    default: () => null,
  }),
  inputResponses: Annotation<InputResponse[]>({
    reducer: (_, newValue) => newValue ?? [], // Replace, not accumulate (raw input)
    default: () => [],
  }),

  // Enriched responses (agent adds semanticTag + answeredAt)
  responses: Annotation<Response[]>({
    reducer: (oldValue, newValue) => [...(oldValue ?? []), ...(newValue ?? [])],
    default: () => [],
  }),

  // Session state
  session: Annotation<WizardSession | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
  config: Annotation<WizardConfig | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
  currentStep: Annotation<Step | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),

  // Derived (computed by determineNextStep)
  stepRuleResults: Annotation<Record<string, boolean>>({
    reducer: (current, updates) => ({ ...current, ...updates }),
    default: () => ({}),
  }),

  // Output
  stepPayload: Annotation<StepPayload | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
});

export type ChatAgentStateType = typeof ChatAgentState.State;
