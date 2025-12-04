import type { WizardStateType } from '../state/wizard.state.js';

/**
 * Load Session Node
 *
 * For resume action - session is already in checkpointed state.
 * This is essentially a pass-through to prepareStep.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const loadSession = async (_state: WizardStateType) => {
  // State already has session from checkpoint
  // Just pass through to prepareStep
  return {};
};
