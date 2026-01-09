import type { ChatAgentStateType } from '../state/chat-agent.state.js';

/**
 * Chat Input Router
 *
 * Routes incoming messages to chat or wizard based on:
 * 1. If last message has wizard_response in additional_kwargs → wizard (user submitted wizard form)
 * 2. If wizardAction is 'init' or 'resume' → wizard (chat handed off to wizard)
 * 3. Otherwise → chat
 */
export const chatInputRouter = (state: ChatAgentStateType): 'chat' | 'wizard' => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];

  // Check if this is a wizard response from the UI
  if (lastMessage?.additional_kwargs?.wizard_response) {
    return 'wizard';
  }

  // Check if chat node is handing off to wizard (via startWizard or resumeWizard tool)
  if (state.wizardAction === 'init' || state.wizardAction === 'resume') {
    return 'wizard';
  }

  // Default to chat
  return 'chat';
};
