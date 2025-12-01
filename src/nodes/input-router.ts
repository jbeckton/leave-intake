import type { WizardStateType } from '../state/wizard-state.js';

/**
 * Input Router
 *
 * Routes to appropriate node based on session existence and action.
 * - No session → initSession (handles leave type selection loop)
 * - Has session + respond → processResponses
 * - Has session + resume → loadSession
 */
export const inputRouter = (state: WizardStateType): string => {
  // Pre-session phase: always route to initSession
  if (!state.session) {
    return 'initSession';
  }

  // Post-session phase: route based on action
  switch (state.action) {
    case 'respond':
      return 'processResponses';
    case 'resume':
      return 'loadSession';
    default:
      throw new Error(`Unknown action: ${state.action}`);
  }
};
