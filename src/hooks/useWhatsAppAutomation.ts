import { useWhatsApp } from "./useWhatsApp";

/**
 * Hook focado na automação/cadência de mensagens para um lead.
 * Camada fina sobre useWhatsApp.
 */
export function useWhatsAppAutomation(leadId: string | null) {
  const wa = useWhatsApp('general');
  const automation = wa.useLeadAutomation(leadId);

  return {
    account: wa.account,
    isConnected: wa.isConnected,
    automation: automation.data ?? null,
    isLoading: automation.isLoading,
    startAutomation: wa.startAutomation,
    toggleAutomation: wa.toggleAutomation,
  };
}
