import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from '@/hooks/useAgency';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { startOfMonth, format } from 'date-fns';

export interface CRMInvestment {
  id: string;
  agency_id: string;
  reference_month: string;
  source: string;
  source_name: string | null;
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const INVESTMENT_SOURCES = [
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'tiktok_ads', label: 'TikTok Ads' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads' },
  { value: 'influencer', label: 'Influenciador Digital' },
  { value: 'offline', label: 'Mídia Offline' },
  { value: 'email_marketing', label: 'E-mail Marketing' },
  { value: 'other', label: 'Outro' },
];

export function useCRMInvestments(referenceMonth?: Date) {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const [investments, setInvestments] = useState<CRMInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalManualInvestment, setTotalManualInvestment] = useState(0);

  const monthDate = referenceMonth || startOfMonth(new Date());
  const monthStr = format(monthDate, 'yyyy-MM-01');

  const fetchInvestments = useCallback(async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_investments')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('reference_month', monthStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []) as CRMInvestment[];
      setInvestments(typedData);
      setTotalManualInvestment(typedData.reduce((sum, inv) => sum + Number(inv.amount), 0));
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast.error('Erro ao carregar investimentos');
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id, monthStr]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const addInvestment = async (data: {
    source: string;
    source_name?: string;
    amount: number;
    notes?: string;
  }) => {
    if (!currentAgency?.id) return null;

    try {
      const { data: newInvestment, error } = await supabase
        .from('crm_investments')
        .insert({
          agency_id: currentAgency.id,
          reference_month: monthStr,
          source: data.source,
          source_name: data.source_name || null,
          amount: data.amount,
          notes: data.notes || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Investimento adicionado');
      await fetchInvestments();
      return newInvestment;
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe um investimento com essa fonte e nome para este mês');
      } else {
        toast.error('Erro ao adicionar investimento');
      }
      console.error('Error adding investment:', error);
      return null;
    }
  };

  const updateInvestment = async (id: string, data: Partial<CRMInvestment>) => {
    try {
      const { error } = await supabase
        .from('crm_investments')
        .update({
          source: data.source,
          source_name: data.source_name,
          amount: data.amount,
          notes: data.notes,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Investimento atualizado');
      await fetchInvestments();
      return true;
    } catch (error) {
      toast.error('Erro ao atualizar investimento');
      console.error('Error updating investment:', error);
      return false;
    }
  };

  const deleteInvestment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('crm_investments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Investimento removido');
      await fetchInvestments();
      return true;
    } catch (error) {
      toast.error('Erro ao remover investimento');
      console.error('Error deleting investment:', error);
      return false;
    }
  };

  return {
    investments,
    loading,
    totalManualInvestment,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    refetch: fetchInvestments,
  };
}
