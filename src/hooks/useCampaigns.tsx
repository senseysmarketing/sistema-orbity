import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { toast } from 'sonner';

export interface Campaign {
  id: string;
  name: string;
  client_id?: string;
  start_date: string;
  end_date: string;
  goal?: string;
  budget?: number;
  status: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
  };
}

export function useCampaigns() {
  const { currentAgency } = useAgency();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients(name)
        `)
        .eq('agency_id', currentAgency.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (error: any) {
      toast.error('Erro ao carregar campanhas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [currentAgency?.id]);

  const createCampaign = async (campaignData: Partial<Campaign>) => {
    if (!currentAgency?.id) return;

    try {
      const payload: any = {
        ...campaignData,
        agency_id: currentAgency.id,
      };
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Campanha criada com sucesso');
      fetchCampaigns();
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar campanha: ' + error.message);
      throw error;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Campanha atualizada');
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Erro ao atualizar campanha: ' + error.message);
      throw error;
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Campanha excluída');
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Erro ao excluir campanha: ' + error.message);
      throw error;
    }
  };

  return {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
