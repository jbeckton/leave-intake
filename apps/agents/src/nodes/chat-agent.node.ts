import { AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { ChatAgentStateType } from '../state/chat-agent.state.js';
import { openAIModel } from '../utils/llm-models.utils.js';
import { getWizardContextTool } from '../tools/get-wizard-context.tool.js';
import { startWizardTool, WIZARD_START_SIGNAL } from '../tools/start-wizard.tool.js';
import { resumeWizardTool, WIZARD_RESUME_SIGNAL } from '../tools/resume-wizard.tool.js';

const tools = [getWizardContextTool, startWizardTool, resumeWizardTool];
const toolsByName = {
  getWizardContext: getWizardContextTool,
  startWizard: startWizardTool,
  resumeWizard: resumeWizardTool,
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
- Starting or resuming a leave request wizard

You have access to these tools:
1. getWizardContext - Retrieves the user's leave request session data including:
   - What leave type they selected
   - Their answers to all wizard questions
   - Current wizard status (not_started, in-progress, completed)

2. startWizard - Initiates a NEW leave request wizard (only use if no wizard is in progress)

3. resumeWizard - Resumes an IN-PROGRESS wizard and shows the current pending step

IMPORTANT INSTRUCTIONS:

1. **Always check context first**: When the user asks about leave eligibility, benefits, policies, or anything related to THEIR leave situation, ALWAYS call getWizardContext FIRST to understand their specific situation before answering. This includes questions about:
   - CFRA or FMLA eligibility
   - Leave duration or timing
   - Benefits during leave
   - Their specific leave type
   - Any personalized leave-related question

2. **Use context in your answers**: After retrieving wizard context, tailor your response to their specific situation. Reference their leave type, dates, and other details they've provided.

3. **Starting vs Resuming wizard**:
   - If a user wants to start a NEW leave request and no wizard is in progress → use startWizard
   - If a user wants to CONTINUE/RESUME their leave request and a wizard IS in progress → use resumeWizard
   - Always check getWizardContext first to know if a wizard is in progress before deciding

4. **When user wants to continue**: If the user says things like "continue", "next step", "go back to the form", "proceed with my request", check the wizard context first, then use resumeWizard if status is 'in-progress'.

5. **Offer to resume after answering questions**: When you answer a user's question and there is an active wizard session (status is 'in-progress'), ALWAYS end your response by offering to continue with their leave request. For example: "Would you like to continue with your leave request?" or "Ready to proceed with the next step of your leave intake?"

Be friendly, professional, and concise. Always personalize your answers when the user has an active or completed leave request.`;

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
    let shouldResumeWizard = false;

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
        // Check if resumeWizard tool was called
        else if (observation.content === WIZARD_RESUME_SIGNAL) {
          shouldResumeWizard = true;
          toolResults.push(
            new ToolMessage({
              content: 'Wizard resumed. The current pending step will now be shown.',
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

    // If wizard should start, return state update to trigger wizard init
    // No message content - wizard form will render directly without text flash
    if (shouldStartWizard) {
      return {
        messages: [],
        wizardAction: 'init' as const,
      };
    }

    // If wizard should resume, return state update to trigger wizard with 'resume' action
    // No message content - wizard form will render directly without text flash
    if (shouldResumeWizard) {
      return {
        messages: [],
        wizardAction: 'resume' as const,
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
