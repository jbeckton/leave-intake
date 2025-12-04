import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { ChatAgentState, ChatAgentStateType } from './state/chat-agent.state.js';
import { RuntimeContextSchema } from './common/types/index.js';
import { chatInputRouter } from './nodes/chat-input-router.node.js';
import { chatNode } from './nodes/chat-agent.node.js';
import { wizardWorkflow } from './agent.graph.js';

// Compile wizard WITHOUT checkpointer - parent provides it
const wizardSubgraph = wizardWorkflow.compile();

/**
 * Wizard Node Wrapper
 *
 * Wraps the wizard subgraph to handle state transformation.
 * Extracts wizard-relevant state, invokes subgraph, returns wizard state updates.
 * Does NOT touch messages - they stay untouched in parent state.
 */
const wizardNode = async (state: ChatAgentStateType) => {
  // wizardAction is required - router ensures this is set
  if (!state.wizardAction) {
    throw new Error('wizardAction is required for wizard node');
  }

  // Extract only wizard-relevant state (exclude messages)
  const wizardInput = {
    wizardAction: state.wizardAction, // Now guaranteed non-null
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

  // Return only wizard state updates (messages untouched)
  return {
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
};

/**
 * Chat Agent Graph
 *
 * Router-based architecture with wizard as wrapped subgraph.
 * Wizard node handles state transformation to avoid touching messages.
 *
 * Flow:
 * - No wizardAction → chatNode (conversational AI)
 * - Has wizardAction → wizardNode (wizard operations)
 *
 * Input formats:
 * 1. Chat: { messages: [...] }
 * 2. Wizard init: { wizardAction: "init" }
 * 3. Wizard respond: { wizardAction: "respond", inputStepId, inputResponses }
 * 4. Wizard resume: { wizardAction: "resume" }
 */
const workflow = new StateGraph(ChatAgentState, RuntimeContextSchema)
  // Add nodes
  .addNode('chat', chatNode)
  .addNode('wizard', wizardNode) // Wrapped wizard - isolates messages from wizard state
  // Router at START
  .addConditionalEdges(START, chatInputRouter, {
    chat: 'chat',
    wizard: 'wizard',
  })
  // Both paths end after single execution
  .addEdge('chat', END)
  .addEdge('wizard', END);

export const chatAgentGraph = workflow.compile({
  checkpointer: new MemorySaver(), // Single checkpointer for all
});
