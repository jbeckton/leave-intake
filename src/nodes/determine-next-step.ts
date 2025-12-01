import { HumanMessage } from '@langchain/core/messages';
import type { WizardStateType } from '../state/wizard-state.js';
import { openAIModel } from '../utils/llm-models.utils.js';

/**
 * Determine Next Step Node
 *
 * Uses LLM to select the next step based on sort order.
 * POC implementation - simple prompt, no rules engine yet.
 */
export const determineNextStep = async (state: WizardStateType) => {
  const { currentStep, config: wizardConfig } = state;

  if (!wizardConfig || !currentStep) {
    throw new Error('Cannot determine next step without config and current step');
  }

  // Sort steps by sort order
  const sortedSteps = [...wizardConfig.steps].sort((a, b) => a.sort - b.sort);
  const currentIndex = sortedSteps.findIndex(s => s.stepId === currentStep.stepId);

  // If no more steps, wizard is complete
  if (currentIndex === -1 || currentIndex >= sortedSteps.length - 1) {
    return {
      currentStep: null, // Signal completion
    };
  }

  const nextStep = sortedSteps[currentIndex + 1];

  // POC: LLM confirms next step (simple prompt for demonstration)
  const prompt = `You are a wizard step router. Given the following wizard steps in order:
${sortedSteps.map((s, i) => `${i + 1}. ${s.name} (${s.title})`).join('\n')}

The user just completed step: "${currentStep.name}" (${currentStep.title})

Based on the sequential order, the next step should be: "${nextStep.name}" (${nextStep.title})

Confirm by responding with just the step name: ${nextStep.name}`;

  try {
    const response = await openAIModel.invoke([new HumanMessage(prompt)]);
    // Log the LLM response for debugging
    console.log('[determineNextStep] LLM response:', response.content);
  }
  catch (error) {
    console.error('[determineNextStep] LLM error:', error);
    // Continue with the next step even if LLM fails
  }

  // Update session with new current step
  const updatedSession = state.session
    ? {
        ...state.session,
        currentStepId: nextStep.stepId,
        updatedAt: new Date().toISOString(),
      }
    : null;

  return {
    currentStep: nextStep,
    session: updatedSession,
  };
};
