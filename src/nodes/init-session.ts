import { LangGraphRunnableConfig } from '@langchain/langgraph';
import type { WizardStateType } from '../state/wizard-state.js';
import { RuntimeContext } from '../common/types/index.js';
import { getContext } from '../utils/getContext.js';
import { loadWizardConfig } from '../utils/wizard-config.utils.js';
import { createSession } from '../utils/session.utils.js';

/**
 * Init Session Node
 *
 * Creates a new wizard session and loads the unified config.
 * This is a simple initialization - no leave type validation loop needed
 * since step visibility is controlled by the rules engine.
 */
export const initSession = async (
  _state: WizardStateType,
  config: LangGraphRunnableConfig<RuntimeContext>,
) => {
  const runtimeContext = getContext(config);
  const wizardConfig = loadWizardConfig('leave-intake-v1');
  const firstStep = wizardConfig.steps[0];

  const session = createSession({
    wizardId: wizardConfig.wizardId,
    employeeId: runtimeContext.employeeId ?? 'unknown',
  });

  session.currentStepId = firstStep.stepId;

  return {
    session,
    config: wizardConfig,
    currentStep: firstStep,
  };
};
