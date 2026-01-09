import { leaveIntakeConfig } from '../data/leave-intake.config.js';
import type { WizardSession, QuestionElement } from '../schemas/wizard.types.js';

type StepStatus = 'completed' | 'current' | 'upcoming' | 'conditional';

export interface QuestionContext {
  questionId: string
  questionText: string
  response: string | null
  responseLabel: string | null
}

export interface StepContext {
  stepId: string
  title: string
  status: StepStatus
  condition?: string
  questions: QuestionContext[]
}

export interface WizardContext {
  status: 'not_started' | 'in-progress' | 'completed'
  steps: StepContext[]
}

/**
 * Get all question elements from config
 */
const getQuestionElements = (): QuestionElement[] => {
  return leaveIntakeConfig.elements.filter(
    (el): el is QuestionElement => el.type === 'question',
  );
};

/**
 * Get human-readable label for a response value (from options)
 */
const getResponseLabel = (questionId: string, value: string): string | null => {
  const questionElements = getQuestionElements();
  const element = questionElements.find(
    el => el.attributes.questionId === questionId,
  );
  if (!element) return value;

  const options = element.attributes.options;
  if (!options) return value;

  const option = options.find(o => o.value === value);
  return option?.label ?? value;
};

/**
 * Determine step status based on session state
 */
const getStepStatus = (
  stepId: string,
  currentStepId: string | null,
  completedStepIds: string[],
  hasRule: boolean,
): StepStatus => {
  if (completedStepIds.includes(stepId)) return 'completed';
  if (stepId === currentStepId) return 'current';
  if (hasRule) return 'conditional';
  return 'upcoming';
};

/**
 * Build complete wizard context for external consumers (e.g., chat agent)
 *
 * Returns all steps, questions, and responses in a structured format
 * that provides full visibility into the wizard journey.
 */
export const buildWizardContext = (session: WizardSession | null): WizardContext => {
  if (!session) {
    return { status: 'not_started', steps: [] };
  }

  // Build response lookup map
  const responseMap = new Map(
    session.responses.map(r => [r.questionId, r.value]),
  );

  // Track completed steps (steps before current)
  const currentStepIndex = leaveIntakeConfig.steps.findIndex(
    s => s.stepId === session.currentStepId,
  );
  const completedStepIds = leaveIntakeConfig.steps
    .slice(0, currentStepIndex)
    .map(s => s.stepId);

  // Get all question elements
  const questionElements = getQuestionElements();

  // Build step contexts
  const steps: StepContext[] = leaveIntakeConfig.steps.map((step) => {
    // Get questions for this step
    const stepQuestions: QuestionContext[] = questionElements
      .filter(el => el.stepId === step.stepId)
      .map((el) => {
        const { questionId, questionText } = el.attributes;
        const response = responseMap.get(questionId) ?? null;
        return {
          questionId,
          questionText,
          response,
          responseLabel: response ? getResponseLabel(questionId, response) : null,
        };
      });

    return {
      stepId: step.stepId,
      title: step.title,
      status: getStepStatus(step.stepId, session.currentStepId, completedStepIds, !!step.rule),
      condition: step.rule,
      questions: stepQuestions,
    };
  });

  return {
    status: session.status as 'in-progress' | 'completed',
    steps,
  };
};
