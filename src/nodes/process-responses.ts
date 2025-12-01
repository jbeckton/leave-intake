import type { WizardStateType } from '../state/wizard-state.js';
import type { Response } from '../types/wizard.types.js';
import { getSemanticTagByQuestionId } from '../utils/wizard-config.utils.js';

/**
 * Process Responses Node
 *
 * Enriches input responses with semanticTag (from config) and answeredAt (generated).
 * Adds enriched responses to session and state.
 */
export const processResponses = async (state: WizardStateType) => {
  const { session, config, inputResponses, inputStepId } = state;

  if (!session) {
    throw new Error('Cannot process responses without a session');
  }

  if (!config) {
    throw new Error('Cannot process responses without a config');
  }

  // Validate stepId matches current step
  if (!inputStepId) {
    throw new Error('stepId is required when submitting responses');
  }

  if (inputStepId !== session.currentStepId) {
    throw new Error(
      `Step mismatch: received "${inputStepId}" but current step is "${session.currentStepId}"`,
    );
  }

  const now = new Date().toISOString();

  // Enrich input responses with semanticTag and answeredAt
  const enrichedResponses: Response[] = inputResponses.map((input) => {
    const semanticTag = getSemanticTagByQuestionId(config, input.questionId);
    if (!semanticTag) {
      throw new Error(`No semanticTag found for questionId: ${input.questionId}`);
    }
    return {
      questionId: input.questionId,
      semanticTag,
      value: input.value,
      answeredAt: now,
    };
  });

  const updatedSession = {
    ...session,
    responses: [...session.responses, ...enrichedResponses],
    updatedAt: now,
  };

  return {
    session: updatedSession,
    responses: enrichedResponses, // Add to state.responses (accumulates via reducer)
    inputResponses: [], // Clear input after processing
  };
};
