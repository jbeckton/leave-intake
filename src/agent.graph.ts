import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { WizardState } from './state/wizard.state.js';
import { RuntimeContextSchema } from './common/types/index.js';
import {
  inputRouter,
  initSession,
  loadSession,
  processResponses,
  determineNextStep,
  prepareStep,
} from './nodes/index.js';

/**
 * Wizard Agent Graph
 *
 * Router-based architecture with action-based routing.
 * Each invocation runs to completion. Checkpointer preserves state via thread_id.
 *
 * Flow:
 * - No session → initSession (leave type selection loop) → prepareStep → END
 * - Has session + respond → processResponses → determineNextStep → prepareStep → END
 * - Has session + resume → loadSession → prepareStep → END
 */
const workflow = new StateGraph(WizardState, RuntimeContextSchema)
  // Add nodes
  .addNode('initSession', initSession)
  .addNode('loadSession', loadSession)
  .addNode('processResponses', processResponses)
  .addNode('determineNextStep', determineNextStep)
  .addNode('prepareStep', prepareStep)
  // Router at START
  .addConditionalEdges(START, inputRouter, {
    initSession: 'initSession',
    processResponses: 'processResponses',
    loadSession: 'loadSession',
  })
  // Edges from nodes to next nodes
  .addEdge('initSession', 'prepareStep')
  .addEdge('loadSession', 'prepareStep')
  .addEdge('processResponses', 'determineNextStep')
  .addEdge('determineNextStep', 'prepareStep')
  .addEdge('prepareStep', END);

// Export workflow for subgraph use (consumer compiles without checkpointer)
export const wizardWorkflow = workflow;

// Export compiled graph with checkpointer for standalone use
export const graph = workflow.compile({ checkpointer: new MemorySaver() });
