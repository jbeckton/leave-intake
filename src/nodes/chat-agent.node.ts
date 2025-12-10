import { AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { ChatAgentStateType } from '../state/chat-agent.state.js';
import { openAIModel } from '../utils/llm-models.utils.js';
import { getWizardContextTool } from '../tools/get-wizard-context.tool.js';
import { startWizardTool, WIZARD_START_SIGNAL } from '../tools/start-wizard.tool.js';

const tools = [getWizardContextTool, startWizardTool];
const toolsByName = {
  getWizardContext: getWizardContextTool,
  startWizard: startWizardTool,
};

/**
 * Chat Agent Node
 *
 * Handles conversational interactions with the user.
 * Provides information about leave types, policies, and assists with questions.
 * Can call getWizardContext tool to understand user's leave request status.
 */
export const chatNode = async (state: ChatAgentStateType) => {
  const { messages } = state;

  const systemPrompt = `You are a helpful HR assistant specializing in employee leave requests.

You can help with:
- Explaining FMLA (Family and Medical Leave Act), CFRA (California Family Rights Act), and other leave types
- Answering questions about leave eligibility and benefits
- Providing guidance on the leave request process
- Clarifying leave policies and requirements
- Starting a leave request wizard when the user wants to submit a leave request

You have access to these tools:
1. getWizardContext - Retrieves the user's current leave request status (if any). Use this to see what they've already answered.
2. startWizard - Initiates the leave request wizard. Use this when the user wants to START a new leave request.

IMPORTANT: When a user wants to request leave, use the startWizard tool. Don't try to collect their information through chat - the wizard handles that.

Be friendly, professional, and concise.`;

  const llmWithTools = openAIModel.bindTools(tools);

  // Initial call
  let response = await llmWithTools.invoke([
    new SystemMessage(systemPrompt),
    ...messages,
  ]);

  // Tool execution loop (ReAct pattern)
  while (response.tool_calls?.length) {
    const toolResults: ToolMessage[] = [];
    let shouldStartWizard = false;

    for (const toolCall of response.tool_calls) {
      const tool = toolsByName[toolCall.name as keyof typeof toolsByName];
      if (tool) {
        // Pass state via RunnableConfig for tool access
        const observation = await tool.invoke(toolCall, {
          configurable: { state },
        });

        // Check if startWizard tool was called
        if (observation.content === WIZARD_START_SIGNAL) {
          shouldStartWizard = true;
          toolResults.push(
            new ToolMessage({
              content: 'Wizard started. The leave request form will now be presented.',
              tool_call_id: toolCall.id ?? '',
            }),
          );
        }
        else {
          toolResults.push(observation);
        }
      }
      else {
        toolResults.push(
          new ToolMessage({
            content: `Tool "${toolCall.name}" not found`,
            tool_call_id: toolCall.id ?? '',
          }),
        );
      }
    }

    // If wizard should start, return state update to trigger wizard
    if (shouldStartWizard) {
      // Add a message indicating wizard is starting
      const handoffMessage = new AIMessage({
        content: "I'll start the leave request wizard for you now. Please follow the steps to submit your request.",
      });
      return {
        messages: [handoffMessage],
        wizardAction: 'init' as const,
      };
    }

    response = await llmWithTools.invoke([
      new SystemMessage(systemPrompt),
      ...messages,
      response,
      ...toolResults,
    ]);
  }

  return { messages: [response] };
};
