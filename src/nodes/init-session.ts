import { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { WizardStateType } from '../state/wizard-state.js';
import type { Response } from '../schemas/wizard.types.js';
import { RuntimeContext } from '../common/types/index.js';
import { getContext } from '../utils/getContext.js';
import {
  loadWizardConfig,
  mapLeaveTypeToWizardId,
  isValidLeaveType,
  getSemanticTagByQuestionId,
} from '../utils/wizard-config.utils.js';
import { createSession } from '../utils/session.utils.js';

const LEAVE_TYPE_QUESTION_ID = 'q-leave-type';
const LEAVE_TYPE_SEMANTIC_TAG = 'INTAKE:QUESTION:LEAVE_TYPE';

/**
 * Init Session Node
 *
 * Handles the leave type selection loop:
 * 1. First call (no inputResponses) → show leave type selector
 * 2. Subsequent calls (with inputResponses) → validate leave type
 *    - Invalid → show leave type selector again
 *    - Valid → create session, load wizard config
 */
export const initSession = async (
  state: WizardStateType,
  config: LangGraphRunnableConfig<RuntimeContext>,
) => {
  const runtimeContext = getContext(config);
  const selectorConfig = loadWizardConfig('leave-type-selector');

  const expectedStepId = selectorConfig.steps[0].stepId;

  // First call - no input responses yet, show leave type selector
  if (!state.inputResponses?.length) {
    return {
      config: selectorConfig,
      currentStep: selectorConfig.steps[0],
    };
  }

  // Validate inputStepId matches the expected step (from config, since no session yet)
  if (state.inputStepId && state.inputStepId !== expectedStepId) {
    throw new Error(
      `Step mismatch: received "${state.inputStepId}" but expected "${expectedStepId}"`,
    );
  }

  // Find leave type input response
  const leaveTypeInput = state.inputResponses.find(
    r => r.questionId === LEAVE_TYPE_QUESTION_ID,
  );

  // Invalid or missing - return leave type selector again
  if (!leaveTypeInput || !isValidLeaveType(leaveTypeInput.value)) {
    return {
      config: selectorConfig,
      currentStep: selectorConfig.steps[0],
      inputResponses: [], // Clear invalid input
    };
  }

  // Valid leave type - enrich response with semanticTag and answeredAt
  const semanticTag = getSemanticTagByQuestionId(selectorConfig, LEAVE_TYPE_QUESTION_ID);
  const enrichedLeaveTypeResponse: Response = {
    questionId: leaveTypeInput.questionId,
    semanticTag: semanticTag ?? LEAVE_TYPE_SEMANTIC_TAG,
    value: leaveTypeInput.value,
    answeredAt: new Date().toISOString(),
  };

  // Create session and load the real wizard
  const wizardId = mapLeaveTypeToWizardId(
    leaveTypeInput.value as Parameters<typeof mapLeaveTypeToWizardId>[0],
  );
  const wizardConfig = loadWizardConfig(wizardId);
  const firstStep = wizardConfig.steps[0];

  const session = createSession({
    wizardId,
    employeeId: runtimeContext.employeeId ?? 'unknown',
    initialResponse: enrichedLeaveTypeResponse,
  });

  // Set the current step ID on the session
  session.currentStepId = firstStep.stepId;

  return {
    session,
    config: wizardConfig,
    currentStep: firstStep,
    // Set enriched response in state (starts accumulation)
    responses: [enrichedLeaveTypeResponse],
    // Clear input after processing
    inputResponses: [],
  };
};
