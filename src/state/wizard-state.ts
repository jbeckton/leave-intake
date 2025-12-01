import { Annotation } from '@langchain/langgraph';
import type {
  WizardAction,
  InputResponse,
  Response,
  WizardSession,
  WizardConfig,
  Step,
  StepPayload,
} from '../types/wizard.types.js';

/**
 * Wizard State Annotation
 *
 * Defines the state shape for the wizard agent graph.
 */
export const WizardState = Annotation.Root({
  // Input (from invoke) - UI submits minimal InputResponse
  action: Annotation<WizardAction>({
    reducer: (_, newValue) => newValue,
    default: () => 'init' as WizardAction,
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

  // Output
  stepPayload: Annotation<StepPayload | null>({
    reducer: (_, newValue) => newValue,
    default: () => null,
  }),
});

export type WizardStateType = typeof WizardState.State;
