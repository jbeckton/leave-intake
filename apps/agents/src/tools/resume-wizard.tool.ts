import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Signal value returned by the tool to indicate wizard should resume.
 * The chat node checks for this and returns appropriate state update.
 */
export const WIZARD_RESUME_SIGNAL = '__RESUME_WIZARD__';

/**
 * Resume Wizard Tool
 *
 * Allows the chat agent to resume an in-progress wizard and present the current step.
 * When called, signals to the chat node that control should transfer back to the wizard.
 */
export const resumeWizardTool = tool(
  async () => {
    // Return a signal that the chat node will recognize
    return WIZARD_RESUME_SIGNAL;
  },
  {
    name: 'resumeWizard',
    description: `Resume an in-progress leave request wizard and show the current pending step.
Use this tool when:
- The user wants to continue their leave request
- The user says "continue", "go back to the wizard", "show me the next step"
- The user finished chatting and wants to return to the wizard form
- The user asks to proceed with their leave request

IMPORTANT: Only use this if a wizard is already in progress (check getWizardContext first to confirm status is 'in-progress').
If no wizard is in progress, use startWizard instead.`,
    schema: z.object({}),
  },
);
