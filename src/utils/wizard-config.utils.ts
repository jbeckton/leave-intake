import { WizardConfigSchema } from '../schemas/wizard.schemas.js';
import type { WizardConfig } from '../schemas/wizard.types.js';
import { wizardConfigs } from '../data/index.js';

/**
 * Load a wizard config by ID
 * Validates the config structure and business rules
 */
export const loadWizardConfig = (wizardId: string): WizardConfig => {
  const config = wizardConfigs[wizardId];
  if (!config) {
    throw new Error(`Unknown wizard: ${wizardId}`);
  }

  // Validate config structure and business rules
  const result = WizardConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid wizard config "${wizardId}": ${result.error.message}`);
  }

  return result.data;
};

/**
 * Look up semanticTag from config by questionId
 * Returns undefined if not found
 */
export const getSemanticTagByQuestionId = (
  config: WizardConfig,
  questionId: string,
): string | undefined => {
  for (const element of config.elements) {
    if (element.type === 'question' && element.attributes.questionId === questionId) {
      return element.attributes.semanticTag;
    }
  }
  return undefined;
};
