import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppAccount {
  id: string;
  agency_id: string;
  instance_name: string;
  api_url: string;
  api_key: string;
  status: string;
  phone_number: string | null;
  qr_code: string | null;
}

interface WhatsAppMessage {
  id: string;
  message_id: string;
  content: string | null;
  is_from_me: boolean;
  message_type: string;
  status: string;
  created_at: string;
}

interface WhatsAppConversation {
  id: string;
  phone_number: string;
  lead_id: string | null;
  last_message_at: string | null;
  last_message_is_from_me: boolean | null;
  last_customer_message_at: string | null;
}

interface AutomationControl {
  id: string;
  lead_id: string;
  status: string;
  current_phase: string;
  current_step_position: number;
  conversation_state: string;
  next_execution_at: string | null;
}

export function useWhatsApp() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get WhatsApp account for current agency
  const { data: account, isLoading: isLoadingAccount } = useQuery({
    queryKey: ['whatsapp-account', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data as WhatsAppAccount | null;
    },
    enabled: !!currentAgency?.id,
  });

  const isConnected = account?.status === 'connected';

  // Connect WhatsApp
  const connect = useMutation({
    mutationFn: async (params: { instance_name: string; api_url: string; api_key: string }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: {
          action: 'connect',
          agency_id: currentAgency?.id,
          ...params,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Connection failed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao conectar WhatsApp', description: error.message, variant: 'destructive' });
    },
  });

  // Disconnect
  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'disconnect', agency_id: currentAgency?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] });
      toast({ title: 'WhatsApp desconectado' });
    },
  });

  // Check status
  const checkStatus = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'status', agency_id: currentAgency?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] });
    },
  });

  // Refresh QR
  const refreshQR = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
        body: { action: 'refresh_qr', agency_id: currentAgency?.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account'] });
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (params: { phone_number: string; message: string; conversation_id?: string; lead_id?: string }) => {
      if (!account?.id) throw new Error('WhatsApp not configured');
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { account_id: account.id, ...params },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Send failed');
      return data;
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao enviar mensagem', description: error.message, variant: 'destructive' });
    },
  });

  // Get messages for a conversation
  const useConversationMessages = (conversationId: string | null) => {
    return useQuery({
      queryKey: ['whatsapp-messages', conversationId],
      queryFn: async () => {
        if (!conversationId) return [];
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data as WhatsAppMessage[];
      },
      enabled: !!conversationId,
      refetchInterval: 5000,
    });
  };

  // Get conversation for a lead
  const useLeadConversation = (leadId: string | null) => {
    return useQuery({
      queryKey: ['whatsapp-conversation', account?.id, leadId],
      queryFn: async () => {
        if (!account?.id || !leadId) return null;
        const { data, error } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('account_id', account.id)
          .eq('lead_id', leadId)
          .maybeSingle();
        if (error) throw error;
        return data as WhatsAppConversation | null;
      },
      enabled: !!account?.id && !!leadId,
    });
  };

  // Get automation status for a lead
  const useLeadAutomation = (leadId: string | null) => {
    return useQuery({
      queryKey: ['whatsapp-automation', account?.id, leadId],
      queryFn: async () => {
        if (!account?.id || !leadId) return null;
        const { data, error } = await supabase
          .from('whatsapp_automation_control')
          .select('*')
          .eq('account_id', account.id)
          .eq('lead_id', leadId)
          .maybeSingle();
        if (error) throw error;
        return data as AutomationControl | null;
      },
      enabled: !!account?.id && !!leadId,
    });
  };

  // Start automation for a lead
  const startAutomation = useMutation({
    mutationFn: async (params: { lead_id: string; phone_number: string }) => {
      if (!account?.id) throw new Error('WhatsApp not configured');

      // Get first greeting template
      const { data: firstTemplate } = await supabase
        .from('whatsapp_message_templates')
        .select('delay_minutes')
        .eq('agency_id', currentAgency?.id)
        .eq('phase', 'greeting')
        .eq('step_position', 1)
        .eq('is_active', true)
        .maybeSingle();

      if (!firstTemplate) throw new Error('Nenhum template de saudação configurado');

      // Create or get conversation
      let { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('account_id', account.id)
        .eq('lead_id', params.lead_id)
        .maybeSingle();

      if (!conv) {
        const { data: newConv, error } = await supabase
          .from('whatsapp_conversations')
          .insert({
            account_id: account.id,
            phone_number: params.phone_number,
            lead_id: params.lead_id,
          })
          .select()
          .single();
        if (error) throw error;
        conv = newConv;
      }

      // Create automation control
      const nextExecution = new Date(Date.now() + firstTemplate.delay_minutes * 60 * 1000).toISOString();

      const { error: automError } = await supabase
        .from('whatsapp_automation_control')
        .upsert({
          account_id: account.id,
          lead_id: params.lead_id,
          conversation_id: conv.id,
          status: 'active',
          current_phase: 'greeting',
          current_step_position: 1,
          next_execution_at: nextExecution,
          conversation_state: 'new_lead',
        }, { onConflict: 'account_id,lead_id' });

      if (automError) throw automError;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-automation'] });
      toast({ title: 'Automação iniciada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao iniciar automação', description: error.message, variant: 'destructive' });
    },
  });

  // Pause/resume automation
  const toggleAutomation = useMutation({
    mutationFn: async (params: { automation_id: string; action: 'pause' | 'resume' }) => {
      const newStatus = params.action === 'pause' ? 'paused' : 'active';
      const { error } = await supabase
        .from('whatsapp_automation_control')
        .update({ status: newStatus })
        .eq('id', params.automation_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-automation'] });
    },
  });

  return {
    account,
    isLoadingAccount,
    isConnected,
    connect,
    disconnect,
    checkStatus,
    refreshQR,
    sendMessage,
    startAutomation,
    toggleAutomation,
    useConversationMessages,
    useLeadConversation,
    useLeadAutomation,
  };
}
