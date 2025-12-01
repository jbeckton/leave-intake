import type { WizardStateType } from '../state/wizard-state.js';
import type { StepPayload, Element } from '../schemas/wizard.types.js';

/**
 * Prepare Step Node
 *
 * Builds the step payload for the UI.
 * Always runs last in every path through the graph.
 */
export const prepareStep = async (state: WizardStateType) => {
  const { currentStep, config: wizardConfig, session } = state;

  // If no current step, wizard is complete
  if (!currentStep || !wizardConfig) {
    const completionPayload: StepPayload = {
      step: {
        stepId: 'complete',
        sort: 999,
        name: 'complete',
        title: 'Wizard Complete',
        semanticTag: 'WIZARD:COMPLETE',
      },
      elements: [],
      session,
    };
    return { stepPayload: completionPayload };
  }

  // Get elements for the current step
  const elements: Element[] = wizardConfig.elements
    .filter(el => el.stepId === currentStep.stepId)
    .sort((a, b) => a.sort - b.sort);

  const stepPayload: StepPayload = {
    step: currentStep,
    elements,
    session,
  };

  return { stepPayload };
};
