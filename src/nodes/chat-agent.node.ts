import { SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { ChatAgentStateType } from '../state/chat-agent.state.js';
import { openAIModel } from '../utils/llm-models.utils.js';
import { getWizardContextTool } from '../tools/get-wizard-context.tool.js';

const tools = [getWizardContextTool];
const toolsByName: Record<string, typeof getWizardContextTool> = {
  getWizardContext: getWizardContextTool,
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

You have access to the getWizardContext tool to retrieve the user's leave request information.
Use it when you need to know what they've already answered to provide personalized guidance.
The tool returns all steps, questions (answered and unanswered), and their current position in the wizard.

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

    for (const toolCall of response.tool_calls) {
      const tool = toolsByName[toolCall.name];
      if (tool) {
        // Pass state via RunnableConfig for tool access
        const observation = await tool.invoke(toolCall, {
          configurable: { state },
        });
        toolResults.push(observation);
      }
      else {
        toolResults.push(new ToolMessage({
          content: `Tool "${toolCall.name}" not found`,
          tool_call_id: toolCall.id ?? '',
        }));
      }
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
