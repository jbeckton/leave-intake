import type { WizardConfig } from '../schemas/wizard.types.js';
import { leaveTypeSelectorConfig } from './leave-type-selector.config.js';
import { pregAdoptionConfig } from './preg-adoption.config.js';

export { leaveTypeSelectorConfig } from './leave-type-selector.config.js';
export { pregAdoptionConfig } from './preg-adoption.config.js';

/**
 * Registry of all wizard configs
 */
export const wizardConfigs: Record<string, WizardConfig> = {
  'leave-type-selector': leaveTypeSelectorConfig,
  'preg-adoption-v1': pregAdoptionConfig,
};
