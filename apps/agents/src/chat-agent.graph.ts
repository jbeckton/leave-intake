import { StateGraph, START, MemorySaver } from '@langchain/langgraph';
import { AIMessage } from '@langchain/core/messages';
import { ChatAgentState, ChatAgentStateType } from './state/chat-agent.state.js';
import { RuntimeContextSchema } from './common/types/index.js';
import { chatInputRouter } from './nodes/chat-input-router.node.js';
import { chatNode } from './nodes/chat-agent.node.js';
import { wizardWorkflow } from './agent.graph.js';
import type { InputResponse } from './schemas/wizard.types.js';

// Compile wizard WITHOUT checkpointer - parent provides it
const wizardSubgraph = wizardWorkflow.compile();

/**
 * Wizard Node - Message-Based Pattern
 *
 * Wraps the wizard subgraph and returns wizard steps as AIMessages with
 * additional_kwargs.wizard_step containing the step payload.
 *
 * Handles three scenarios:
 * 1. 'init' - Start a new wizard
 * 2. 'respond' - Process user responses and show next step
 * 3. 'resume' - Re-present the current pending step (no processing)
 *
 * User responses come back as HumanMessages with additional_kwargs.wizard_response.
 */
const wizardNode = async (state: ChatAgentStateType) => {
  const { messages } = state;

  // Handle 'resume' action specially - just re-present current step without processing
  if (state.wizardAction === 'resume') {
    // Use existing stepPayload from state
    const stepPayload = state.stepPayload;

    if (!stepPayload || stepPayload.step?.stepId === 'complete') {
      // No valid step to resume - this shouldn't happen if chat agent checks first
      const noStepMessage = new AIMessage({
        content: 'There is no pending wizard step to resume. Would you like to start a new leave request?',
      });
      return {
        messages: [noStepMessage],
        wizardAction: null,
      };
    }

    // Re-present the current step
    const stepMessage = new AIMessage({
      content: `**${stepPayload.step.title}**`,
      additional_kwargs: {
        wizard_step: stepPayload,
      },
    });

    return {
      messages: [stepMessage],
      wizardAction: null, // Clear the action
    };
  }

  // Extract wizard responses from the last human message (if any)
  const lastMessage = messages[messages.length - 1];
  let inputResponses: InputResponse[] = state.inputResponses ?? [];

  // Check if this is a wizard response from the UI
  if (lastMessage?.additional_kwargs?.wizard_response) {
    inputResponses = lastMessage.additional_kwargs.wizard_response as InputResponse[];
  }

  // Determine wizard action based on state
  // If we have a session in progress, this is a 'respond' action
  // Otherwise, it's an 'init' action
  const wizardAction: 'init' | 'respond' = state.session?.status === 'in-progress' ? 'respond' : 'init';

  // Extract only wizard-relevant state (exclude messages)
  const wizardInput = {
    wizardAction,
    inputStepId: state.currentStep?.stepId ?? null,
    inputResponses,
    responses: state.responses,
    session: state.session,
    config: state.config,
    currentStep: state.currentStep,
    stepRuleResults: state.stepRuleResults,
    stepPayload: state.stepPayload,
  };

  // Invoke wizard subgraph
  const result = await wizardSubgraph.invoke(wizardInput);

  // Build state update from wizard result (excluding messages - we'll add our own)
  const stateUpdate = {
    wizardAction: result.wizardAction,
    inputStepId: result.inputStepId,
    inputResponses: result.inputResponses,
    responses: result.responses,
    session: result.session,
    config: result.config,
    currentStep: result.currentStep,
    stepRuleResults: result.stepRuleResults,
    stepPayload: result.stepPayload,
  };

  // Build the step payload for the message
  const stepPayload = result.stepPayload;

  // Create AI message with wizard step embedded in additional_kwargs
  const isComplete = stepPayload?.step?.stepId === 'complete';
  const stepMessage = new AIMessage({
    content: isComplete
      ? 'Your leave request has been submitted successfully!'
      : `**${stepPayload?.step?.title ?? 'Wizard Step'}**`,
    additional_kwargs: {
      wizard_step: stepPayload,
    },
  });

  return {
    ...stateUpdate,
    messages: [stepMessage],
  };
};

/**
 * Chat Completion Router
 *
 * After chat node completes, checks if it wants to hand off to wizard.
 * If chat node returned wizardAction: 'init' or 'resume', route to wizard.
 * Otherwise, end the graph.
 */
const chatCompletionRouter = (state: ChatAgentStateType): 'wizard' | '__end__' => {
  // If chat node set wizardAction (via startWizard or resumeWizard tool), hand off to wizard
  if (state.wizardAction === 'init' || state.wizardAction === 'resume') {
    return 'wizard';
  }
  return '__end__';
};

/**
 * Wizard Completion Router
 *
 * After wizard node processes, always end the graph.
 * The next user message will come back and be routed appropriately.
 * No looping needed - each step is a separate request/response cycle.
 */
const wizardCompletionRouter = (_state: ChatAgentStateType): '__end__' => {
  // Always end after wizard step - next input will come as new message
  return '__end__';
};

/**
 * Chat Agent Graph
 *
 * Router-based architecture with wizard as wrapped subgraph using message-based pattern.
 * Wizard steps are returned as AIMessages with additional_kwargs.wizard_step.
 * User responses come as HumanMessages with additional_kwargs.wizard_response.
 *
 * Flow:
 * - Regular chat message → chatNode → END (may hand off to wizard if startWizard tool called)
 * - Wizard init (from chat handoff) → wizardNode → AIMessage with wizard_step → END
 * - Wizard response message → wizardNode → AIMessage with next wizard_step → END
 * - (repeat until wizard complete)
 *
 * Input formats:
 * 1. Chat: { messages: [HumanMessage] }
 * 2. Wizard response: { messages: [HumanMessage with additional_kwargs.wizard_response] }
 */
const workflow = new StateGraph(ChatAgentState, RuntimeContextSchema)
  // Add nodes
  .addNode('chat', chatNode)
  .addNode('wizard', wizardNode)
  // Router at START
  .addConditionalEdges(START, chatInputRouter, {
    chat: 'chat',
    wizard: 'wizard',
  })
  // Chat can hand off to wizard (via startWizard tool) or end
  .addConditionalEdges('chat', chatCompletionRouter)
  // Wizard loops via conditional edge until complete
  .addConditionalEdges('wizard', wizardCompletionRouter);

export const chatAgentGraph = workflow.compile({
  checkpointer: new MemorySaver(),
});
