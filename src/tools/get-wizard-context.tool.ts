import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { buildWizardContext } from '../utils/wizard-context.utils.js';
import type { WizardSession } from '../schemas/wizard.types.js';

/**
 * Get Wizard Context Tool
 *
 * Thin wrapper that exposes wizard context to the chat agent.
 * The context building logic lives in wizard-context.utils.ts.
 */
export const getWizardContextTool = tool(
  async (_, config) => {
    // Access session from tool runtime context (passed by chat node)
    // Session is a direct key on state (merged state with wizard)
    const state = config?.configurable?.state;
    const session: WizardSession | null = state?.session ?? null;

    const context = buildWizardContext(session);
    return JSON.stringify(context, null, 2);
  },
  {
    name: 'getWizardContext',
    description: `Get the current leave request wizard state. Returns all steps, questions, and user responses.
Use this to understand:
- What leave type the user selected
- What questions they've answered and their responses
- What step they're currently on
- What questions are still pending
- What conditional steps may appear based on their answers`,
    schema: z.object({}),
  },
);
