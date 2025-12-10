import type { ChatAgentStateType } from '../state/chat-agent.state.js';

/**
 * Chat Input Router
 *
 * Routes requests based on wizardAction.
 * - wizardAction: 'init' → route to wizard subgraph
 * - All other cases → route to chat
 *
 * Note: 'respond' and 'resume' are no longer valid entry points with the interrupt pattern.
 * Resumption happens via Command({ resume }) which continues from the interrupt checkpoint,
 * not through START.
 */
export const chatInputRouter = (state: ChatAgentStateType): 'chat' | 'wizard' => {
  if (state.wizardAction === 'init') {
    return 'wizard';
  }
  return 'chat';
};
