import type { WizardSession, Response } from '../schemas/wizard.types.js';

interface CreateSessionParams {
  wizardId: string
  employeeId: string
  initialResponse?: Response
}

/**
 * Generate a unique session ID
 */
const generateSessionId = (): string => {
  return `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Create a new wizard session
 */
export const createSession = (params: CreateSessionParams): WizardSession => {
  const { wizardId, employeeId, initialResponse } = params;
  const now = new Date().toISOString();

  return {
    sessionId: generateSessionId(),
    wizardId,
    employeeId,
    createdAt: now,
    updatedAt: now,
    currentStepId: '', // Will be set by the node that creates the session
    status: 'in-progress',
    responses: initialResponse ? [initialResponse] : [],
  };
};
