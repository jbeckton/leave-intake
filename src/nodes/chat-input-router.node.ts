import type { ChatAgentStateType } from '../state/chat-agent.state.js';

/**
 * Chat Input Router
 *
 * Routes requests based on presence of wizardAction.
 * - wizardAction present → route to wizard subgraph
 * - wizardAction absent → route to chat
 */
export const chatInputRouter = (state: ChatAgentStateType): 'chat' | 'wizard' => {
  if (state.wizardAction) {
    return 'wizard';
  }
  return 'chat';
};
