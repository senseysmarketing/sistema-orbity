import { useState, useEffect } from "react";
import { Trophy, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { ProgramSelector } from "@/components/goals/ProgramSelector";
import { PPRDashboard } from "@/components/goals/PPRDashboard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BonusProgram {
  id: string;
  agency_id: string;
  program_type: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
}

export default function Goals() {
  const { currentAgency, agencyRole } = useAgency();
  const { toast } = useToast();
  const [activeProgram, setActiveProgram] = useState<BonusProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const isAdmin = agencyRole === "admin" || agencyRole === "owner";

  useEffect(() => {
    if (currentAgency?.id) fetchProgram();
  }, [currentAgency?.id]);

  const fetchProgram = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bonus_programs")
      .select("*")
      .eq("agency_id", currentAgency!.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    setActiveProgram(data as BonusProgram | null);
    setLoading(false);
  };

  const handleSelectProgram = async (type: string) => {
    if (type !== "ppr") {
      toast({ title: "Em breve", description: "Este modelo estará disponível em breve." });
      return;
    }

    // Deactivate existing
    if (activeProgram) {
      await supabase
        .from("bonus_programs")
        .update({ is_active: false } as Record<string, unknown>)
        .eq("id", activeProgram.id);
    }

    const names: Record<string, string> = {
      ppr: "Participação nos Resultados (PPR)",
      salary_multiplier: "Multiplicador de Salário",
      spot_bonus: "Bônus Fixo por Meta",
    };

    const { error } = await supabase.from("bonus_programs").insert([{
      agency_id: currentAgency!.id,
      program_type: type,
      name: names[type],
      is_active: true,
      config: { bonus_pool_percent: 10, nps_target: 60, period_type: "quarterly" },
    }]);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    setShowSelector(false);
    fetchProgram();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!activeProgram || showSelector) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Metas & Bônus</h1>
          </div>
          {activeProgram && (
            <Button variant="outline" size="sm" onClick={() => setShowSelector(false)}>
              Voltar ao programa
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          Escolha o modelo de bonificação que melhor se encaixa na sua agência.
        </p>
        <ProgramSelector onSelect={handleSelectProgram} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Metas & Bônus</h1>
            <p className="text-sm text-muted-foreground">{activeProgram.name}</p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setShowSelector(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Trocar Programa
          </Button>
        )}
      </div>

      {activeProgram.program_type === "ppr" && (
        <PPRDashboard program={activeProgram} isAdmin={isAdmin} />
      )}
    </div>
  );
}
