import type { WizardStateType } from '../state/wizard-state.js';

/**
 * Input Router
 *
 * Routes to appropriate node based on action.
 * - init → initSession (creates new session)
 * - respond → processResponses (handles step responses)
 * - resume → loadSession (restores existing session)
 */
export const inputRouter = (state: WizardStateType): string => {
  switch (state.action) {
    case 'init':
      return 'initSession';
    case 'respond':
      return 'processResponses';
    case 'resume':
      return 'loadSession';
    default:
      throw new Error(`Unknown action: ${state.action}`);
  }
};
