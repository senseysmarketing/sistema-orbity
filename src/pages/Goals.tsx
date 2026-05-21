import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Skeleton } from "@/components/ui/skeleton";
import { PerformancePPRPage } from "@/components/performance/PerformancePPRPage";

export default function Goals() {
  const { currentAgency, agencyRole } = useAgency();
  const [programId, setProgramId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = agencyRole === "admin" || agencyRole === "owner";

  useEffect(() => {
    if (!currentAgency?.id) return;
    (async () => {
      setLoading(true);
      // Find active PPR program or auto-create
      const { data: existing } = await supabase
        .from("bonus_programs")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .eq("program_type", "ppr")
        .maybeSingle();

      if (existing) {
        if (!existing.is_active) {
          await supabase.from("bonus_programs").update({ is_active: true } as any).eq("id", existing.id);
        }
        setProgramId(existing.id);
      } else if (isAdmin) {
        const { data: created } = await supabase
          .from("bonus_programs")
          .insert([{
            agency_id: currentAgency.id,
            program_type: "ppr",
            name: "Participação nos Resultados (PPR)",
            is_active: true,
            config: { bonus_pool_percent: 10, period_type: "quarterly" },
          }] as any)
          .select()
          .single();
        if (created) setProgramId(created.id);
      }
      setLoading(false);
    })();
  }, [currentAgency?.id, isAdmin]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!programId) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Aguarde o administrador da agência configurar o programa.
      </div>
    );
  }

  return <PerformancePPRPage programId={programId} isAdmin={isAdmin} />;
}
