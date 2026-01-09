import type { WizardConfig } from '../schemas/wizard.types.js';
import { leaveIntakeConfig } from './leave-intake.config.js';

export { leaveIntakeConfig } from './leave-intake.config.js';

/**
 * Registry of all wizard configs
 */
export const wizardConfigs: Record<string, WizardConfig> = {
  'leave-intake-v1': leaveIntakeConfig,
};
