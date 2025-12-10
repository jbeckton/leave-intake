import { StateGraph, START, MemorySaver, interrupt } from '@langchain/langgraph';
import { ChatAgentState, ChatAgentStateType } from './state/chat-agent.state.js';
import { RuntimeContextSchema } from './common/types/index.js';
import { chatInputRouter } from './nodes/chat-input-router.node.js';
import { chatNode } from './nodes/chat-agent.node.js';
import { wizardWorkflow } from './agent.graph.js';

// Compile wizard WITHOUT checkpointer - parent provides it
const wizardSubgraph = wizardWorkflow.compile();

/**
 * Wizard Node Wrapper with Interrupt Pattern
 *
 * Wraps the wizard subgraph to handle state transformation and human-in-the-loop.
 * After wizard returns stepPayload, interrupts to present UI to user.
 * When resumed via Command({ resume: inputResponses }), transforms input for next step.
 */
const wizardNode = async (state: ChatAgentStateType) => {
  // wizardAction is required - router ensures this is set
  if (!state.wizardAction) {
    throw new Error('wizardAction is required for wizard node');
  }

  // Extract only wizard-relevant state (exclude messages)
  const wizardInput = {
    wizardAction: state.wizardAction,
    inputStepId: state.inputStepId,
    inputResponses: state.inputResponses,
    responses: state.responses,
    session: state.session,
    config: state.config,
    currentStep: state.currentStep,
    stepRuleResults: state.stepRuleResults,
    stepPayload: state.stepPayload,
  };

  // Invoke wizard subgraph
  const result = await wizardSubgraph.invoke(wizardInput);

  // Build state update from wizard result
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

  // If wizard is complete, return without interrupt
  if (result.stepPayload?.step?.stepId === 'complete') {
    return stateUpdate;
  }

  // Interrupt with stepPayload for generative UI
  // This pauses the graph and sends stepPayload to the client
  const userResponse = interrupt(result.stepPayload);

  // When resumed, userResponse contains the Command resume value
  // Transform into next wizard invocation input
  const inputResponses = Array.isArray(userResponse)
    ? userResponse
    : userResponse?.inputResponses ?? [];

  return {
    ...stateUpdate,
    wizardAction: 'respond' as const,
    inputStepId: result.stepPayload?.step?.stepId ?? null,
    inputResponses,
  };
};

/**
 * Chat Completion Router
 *
 * After chat node completes, checks if it wants to hand off to wizard.
 * If chat node returned wizardAction: 'init', route to wizard.
 * Otherwise, end the graph.
 */
const chatCompletionRouter = (state: ChatAgentStateType): 'wizard' | '__end__' => {
  // If chat node set wizardAction (via startWizard tool), hand off to wizard
  if (state.wizardAction === 'init') {
    return 'wizard';
  }
  return '__end__';
};

/**
 * Wizard Completion Router
 *
 * Determines if wizard should loop (continue to next step) or end.
 * After interrupt resume, wizardAction is set to 'respond' - loop back to wizard.
 * When stepPayload indicates complete, end the graph.
 */
const wizardCompletionRouter = (state: ChatAgentStateType): 'wizard' | '__end__' => {
  // If wizard completed, end
  if (state.stepPayload?.step?.stepId === 'complete') {
    return '__end__';
  }
  // If wizardAction is set (from interrupt resume), continue wizard loop
  if (state.wizardAction) {
    return 'wizard';
  }
  return '__end__';
};

/**
 * Chat Agent Graph
 *
 * Router-based architecture with wizard as wrapped subgraph using interrupt pattern.
 * Wizard node handles state transformation and interrupts for human-in-the-loop.
 *
 * Flow:
 * - No wizardAction → chatNode → (may hand off to wizard or END)
 * - Has wizardAction → wizardNode → interrupt(stepPayload) → PAUSED
 * - Command({ resume }) → wizardNode (loops until complete) → END
 *
 * Input formats:
 * 1. Chat: { messages: [...] }
 * 2. Wizard init: { wizardAction: "init" }
 * 3. Resume: Command({ resume: inputResponses })
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
