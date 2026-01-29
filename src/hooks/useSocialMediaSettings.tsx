import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SocialMediaSettings {
  id: string;
  agency_id: string;
  default_due_date_days_before: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for social media settings.
 * @param agencyId - Optional agency ID. If not provided, the hook will return defaults.
 */
export function useSocialMediaSettings(agencyId?: string | null) {
  const [settings, setSettings] = useState<SocialMediaSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('social_media_settings')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching social media settings:', error);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<SocialMediaSettings>) => {
    if (!agencyId) return;

    try {
      if (settings) {
        // Update existing
        const { error } = await supabase
          .from('social_media_settings')
          .update(updates)
          .eq('id', settings.id);

        if (error) throw error;
        setSettings({ ...settings, ...updates });
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('social_media_settings')
          .insert({
            agency_id: agencyId,
            ...updates
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }
      toast.success('Configurações salvas com sucesso');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
      throw error;
    }
  };

  const getDefaultDueDateDaysBefore = useCallback(() => {
    return settings?.default_due_date_days_before ?? 3;
  }, [settings?.default_due_date_days_before]);

  return {
    settings,
    loading,
    updateSettings,
    getDefaultDueDateDaysBefore,
    refetch: fetchSettings,
  };
}
