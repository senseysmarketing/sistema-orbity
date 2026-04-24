import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import type { BrandThemeKey } from "@/lib/brandThemes";

export interface BrandingUpdate {
  logo_url?: string | null;
  brand_theme?: BrandThemeKey;
  public_email?: string | null;
  public_phone?: string | null;
  website_url?: string | null;
}

export function useUpdateAgencyBranding() {
  const { currentAgency, refreshAgencies } = useAgency();
  const [saving, setSaving] = useState(false);

  const update = async (patch: BrandingUpdate) => {
    if (!currentAgency?.id) {
      toast.error("Agência não encontrada.");
      return false;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("agencies")
        .update(patch)
        .eq("id", currentAgency.id);

      if (error) throw error;

      await refreshAgencies();
      toast.success("Branding atualizado com sucesso!");
      return true;
    } catch (e: any) {
      console.error("[useUpdateAgencyBranding]", e);
      toast.error(e?.message ?? "Erro ao salvar branding.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { update, saving };
}
