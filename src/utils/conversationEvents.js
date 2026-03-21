export const CONVERSATION_READ_EVENT = 'conversations:read';

export const emitConversationRead = (conversationId, forRole, uid = null) => {
  if (typeof window === 'undefined') return;
  if (!conversationId || !forRole) return;

  window.dispatchEvent(new CustomEvent(CONVERSATION_READ_EVENT, {
    detail: { conversationId, forRole, uid }
  }));
};
