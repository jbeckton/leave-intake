import { WizardConfigSchema } from '../schemas/wizard.schemas.js';
import type { WizardConfig, LeaveType } from '../types/wizard.types.js';
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
 * Map leave type value to wizard ID
 */
export const mapLeaveTypeToWizardId = (leaveType: LeaveType): string => {
  const mapping: Record<LeaveType, string> = {
    'pregnancy-adoption': 'preg-adoption-v1',
    'medical': 'medical-v1', // TODO: Create this config
    'family-care': 'family-care-v1', // TODO: Create this config
  };
  return mapping[leaveType];
};

/**
 * Validate if a value is a valid leave type
 */
export const isValidLeaveType = (value: string): value is LeaveType => {
  return ['pregnancy-adoption', 'medical', 'family-care'].includes(value);
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
