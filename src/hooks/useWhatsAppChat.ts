import { useWhatsApp } from "./useWhatsApp";

/**
 * Hook focado no chat manual do CRM (modal do lead).
 * Camada fina sobre useWhatsApp; mantém compatibilidade e isola responsabilidades.
 */
export function useWhatsAppChat(leadId: string | null) {
  const wa = useWhatsApp('general');
  const conversation = wa.useLeadConversation(leadId);
  const messages = wa.useConversationMessages(conversation.data?.id || null);

  return {
    account: wa.account,
    isLoadingAccount: wa.isLoadingAccount,
    isConnected: wa.isConnected,
    conversation: conversation.data ?? null,
    isLoadingConversation: conversation.isLoading,
    messages: messages.data ?? [],
    isLoadingMessages: messages.isLoading,
    sendMessage: wa.sendMessage,
    syncMessages: wa.syncMessages,
  };
}
