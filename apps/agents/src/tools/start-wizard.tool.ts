import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Signal value returned by the tool to indicate wizard should start.
 * The chat node checks for this and returns appropriate state update.
 */
export const WIZARD_START_SIGNAL = '__START_WIZARD__';

/**
 * Start Wizard Tool
 *
 * Allows the chat agent to initiate the leave request wizard.
 * When called, signals to the chat node that control should transfer to the wizard.
 */
export const startWizardTool = tool(
  async () => {
    // Return a signal that the chat node will recognize
    return WIZARD_START_SIGNAL;
  },
  {
    name: 'startWizard',
    description: `Start the leave request wizard to help the user submit a leave of absence request.
Use this tool when:
- The user wants to request time off or leave
- The user asks to start, begin, or initiate a leave request
- The user says they need to take leave (FMLA, medical, family care, pregnancy/adoption)
- The user wants to fill out the leave intake form

Do NOT use this tool if:
- The user is just asking questions about leave policies
- The user wants to know their eligibility without starting a request
- A wizard is already in progress (check getWizardContext first)`,
    schema: z.object({}),
  },
);
