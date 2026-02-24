import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PPRConfigDialog } from "./PPRConfigDialog";
import { NPSResponseForm } from "./NPSResponseForm";
import { NPSChart } from "./NPSChart";
import { ScorecardCard } from "./ScorecardCard";
import { DollarSign, TrendingUp, Gift, Star, Plus, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PPRDashboardProps {
  program: { id: string; config: Record<string, unknown> };
  isAdmin: boolean;
}

interface BonusPeriod {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  revenue_target: number;
  revenue_actual: number;
  net_profit: number;
  bonus_pool_percent: number;
  bonus_pool_amount: number;
  nps_target: number;
  nps_actual: number;
  status: string;
}

interface NpsResponse {
  id: string;
  client_name: string;
  score: number;
  category: string;
  comment: string | null;
}

interface Employee {
  id: string;
  name: string;
  role: string | null;
  user_id?: string;
}

interface Scorecard {
  id: string;
  employee_id: string;
  user_id: string | null;
  nps_retention_score: number;
  technical_delivery_score: number;
  process_innovation_score: number;
  weighted_average: number;
  max_share: number;
  final_bonus: number;
}

export function PPRDashboard({ program, isAdmin }: PPRDashboardProps) {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const { toast } = useToast();
  const agencyId = currentAgency?.id;

  const [periods, setPeriods] = useState<BonusPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [npsResponses, setNpsResponses] = useState<NpsResponse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  useEffect(() => {
    if (agencyId) fetchPeriods();
  }, [agencyId]);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchNpsResponses();
      fetchScorecards();
    }
  }, [selectedPeriodId]);

  useEffect(() => {
    if (agencyId) fetchEmployees();
  }, [agencyId]);

  const fetchPeriods = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bonus_periods")
      .select("*")
      .eq("agency_id", agencyId!)
      .eq("program_id", program.id)
      .order("start_date", { ascending: false });
    const list = (data || []) as unknown as BonusPeriod[];
    setPeriods(list);
    if (list.length > 0) setSelectedPeriodId(list[0].id);
    setLoading(false);
  };

  const fetchNpsResponses = async () => {
    const { data } = await supabase
      .from("nps_responses")
      .select("*")
      .eq("period_id", selectedPeriodId)
      .order("created_at", { ascending: false });
    setNpsResponses((data || []) as unknown as NpsResponse[]);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name, role")
      .eq("agency_id", agencyId!)
      .eq("is_active", true);
    setEmployees((data || []) as unknown as Employee[]);
  };

  const fetchScorecards = async () => {
    const { data } = await supabase
      .from("employee_scorecards")
      .select("*")
      .eq("period_id", selectedPeriodId);
    setScorecards((data || []) as unknown as Scorecard[]);
  };

  // NPS calculations
  const npsStats = useMemo(() => {
    const total = npsResponses.length;
    if (total === 0) return { promoters: 0, neutrals: 0, detractors: 0, nps: 0 };
    const promoters = npsResponses.filter((r) => r.category === "promoter").length;
    const detractors = npsResponses.filter((r) => r.category === "detractor").length;
    const neutrals = total - promoters - detractors;
    const nps = Math.round(((promoters - detractors) / total) * 100);
    return { promoters, neutrals, detractors, nps };
  }, [npsResponses]);

  // Update period NPS
  useEffect(() => {
    if (selectedPeriod && npsResponses.length > 0 && npsStats.nps !== selectedPeriod.nps_actual) {
      supabase
        .from("bonus_periods")
        .update({ nps_actual: npsStats.nps } as Record<string, unknown>)
        .eq("id", selectedPeriodId)
        .then(() => {
          setPeriods((prev) =>
            prev.map((p) => (p.id === selectedPeriodId ? { ...p, nps_actual: npsStats.nps } : p))
          );
        });
    }
  }, [npsStats.nps, selectedPeriodId]);

  const handleCreatePeriod = async () => {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const year = now.getFullYear();
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1).toISOString().split("T")[0];
    const endDate = new Date(year, startMonth + 3, 0).toISOString().split("T")[0];

    const config = program.config as Record<string, number>;
    const { error } = await supabase.from("bonus_periods").insert([{
      agency_id: agencyId,
      program_id: program.id,
      label: `Q${quarter} ${year}`,
      start_date: startDate,
      end_date: endDate,
      revenue_target: config.revenue_target || 50000,
      bonus_pool_percent: config.bonus_pool_percent || 10,
      nps_target: config.nps_target || 60,
    }]);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Período criado!" });
      fetchPeriods();
    }
  };

  const handleNpsAdded = () => {
    fetchNpsResponses();
  };

  const handleScorecardUpdate = async (
    employeeId: string,
    field: string,
    value: number
  ) => {
    const existing = scorecards.find((s) => s.employee_id === employeeId);
    const poolAmount = selectedPeriod?.bonus_pool_amount || 0;
    const numEmployees = employees.length || 1;

    const getUpdatedValues = (sc: Partial<Scorecard>, f: string, v: number) => {
      const nps = f === "nps_retention_score" ? v : sc.nps_retention_score || 0;
      const tech = f === "technical_delivery_score" ? v : sc.technical_delivery_score || 0;
      const proc = f === "process_innovation_score" ? v : sc.process_innovation_score || 0;
      const avg = (nps * 4 + tech * 4 + proc * 2) / 10;
      const maxShare = poolAmount / numEmployees;
      const finalBonus = maxShare * (avg / 10);
      return {
        nps_retention_score: nps,
        technical_delivery_score: tech,
        process_innovation_score: proc,
        weighted_average: Math.round(avg * 100) / 100,
        max_share: Math.round(maxShare * 100) / 100,
        final_bonus: Math.round(finalBonus * 100) / 100,
      };
    };

    if (existing) {
      const vals = getUpdatedValues(existing, field, value);
      await supabase
        .from("employee_scorecards")
        .update(vals as Record<string, unknown>)
        .eq("id", existing.id);
    } else {
      const vals = getUpdatedValues({}, field, value);
      await supabase.from("employee_scorecards").insert([{
        agency_id: agencyId,
        period_id: selectedPeriodId,
        employee_id: employeeId,
        ...vals,
      }]);
    }
    fetchScorecards();
  };

  const handlePeriodUpdate = async (updates: Partial<BonusPeriod>) => {
    if (!selectedPeriodId) return;
    
    // Calculate pool amount if net_profit or bonus_pool_percent changed
    const period = { ...selectedPeriod, ...updates };
    const poolAmount = (period.net_profit || 0) * ((period.bonus_pool_percent || 10) / 100);
    
    await supabase
      .from("bonus_periods")
      .update({ ...updates, bonus_pool_amount: poolAmount } as Record<string, unknown>)
      .eq("id", selectedPeriodId);
    
    fetchPeriods();
    // Recalculate scorecards with new pool
    fetchScorecards();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
    </div>;
  }

  if (periods.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Gift className="h-12 w-12 text-muted-foreground mx-auto" />
        <h3 className="text-lg font-medium text-foreground">Nenhum período criado</h3>
        <p className="text-muted-foreground">Crie o primeiro período de avaliação para começar.</p>
        {isAdmin && (
          <Button onClick={handleCreatePeriod}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Período Atual
          </Button>
        )}
      </div>
    );
  }

  const revenueProgress = selectedPeriod
    ? Math.min(100, (selectedPeriod.revenue_actual / (selectedPeriod.revenue_target || 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isAdmin && (
          <>
            <Button variant="outline" size="sm" onClick={handleCreatePeriod}>
              <Plus className="h-4 w-4 mr-1" /> Novo Período
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(true)}>
              <Settings2 className="h-4 w-4 mr-1" /> Configurar
            </Button>
          </>
        )}
        {selectedPeriod && (
          <Badge variant={selectedPeriod.status === "open" ? "default" : "secondary"}>
            {selectedPeriod.status === "open" ? "Aberto" : "Encerrado"}
          </Badge>
        )}
      </div>

      {/* BLOCO 1: Placar do Trimestre */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">📊 Placar do Trimestre</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Faturamento */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(selectedPeriod?.revenue_actual || 0)}
              </p>
              <Progress value={revenueProgress} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Meta: {formatCurrency(selectedPeriod?.revenue_target || 0)} ({Math.round(revenueProgress)}%)
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Lucro Líquido */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(selectedPeriod?.net_profit || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Apurado no período
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Pote de Bônus */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pote de Bônus</CardTitle>
                <Gift className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(selectedPeriod?.bonus_pool_amount || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedPeriod?.bonus_pool_percent || 10}% do lucro líquido
              </p>
            </CardContent>
          </Card>

          {/* Card 4: NPS */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">NPS da Agência</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">{npsStats.nps}</p>
                {selectedPeriod && (
                  <Badge
                    variant={npsStats.nps >= selectedPeriod.nps_target ? "default" : "destructive"}
                    className={npsStats.nps >= selectedPeriod.nps_target ? "bg-emerald-500" : ""}
                  >
                    {npsStats.nps >= selectedPeriod.nps_target ? "✓ Meta atingida" : "Abaixo da meta"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Meta: {selectedPeriod?.nps_target || 60}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BLOCO 2: NPS (admin only) */}
      {isAdmin && selectedPeriod && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">📋 Calculadora de NPS</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <NPSResponseForm
                periodId={selectedPeriodId}
                agencyId={agencyId!}
                onAdded={handleNpsAdded}
              />
              {/* NPS Responses List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Respostas ({npsResponses.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                  {npsResponses.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.client_name}</p>
                        {r.comment && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.comment}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{r.score}</span>
                        <Badge
                          variant="outline"
                          className={
                            r.category === "promoter"
                              ? "border-emerald-500 text-emerald-600"
                              : r.category === "detractor"
                              ? "border-red-500 text-red-600"
                              : "border-yellow-500 text-yellow-600"
                          }
                        >
                          {r.category === "promoter" ? "Promotor" : r.category === "detractor" ? "Detrator" : "Neutro"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {npsResponses.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma resposta ainda
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            <NPSChart
              promoters={npsStats.promoters}
              neutrals={npsStats.neutrals}
              detractors={npsStats.detractors}
              npsScore={npsStats.nps}
            />
          </div>
        </div>
      )}

      {/* BLOCO 3: Scorecard */}
      {selectedPeriod && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">🏆 Scorecard da Equipe</h2>
          {isAdmin && selectedPeriod && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Card className="p-3">
                <label className="text-xs text-muted-foreground">Faturamento Real</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={selectedPeriod.revenue_actual}
                  onChange={(e) => handlePeriodUpdate({ revenue_actual: Number(e.target.value) })}
                />
              </Card>
              <Card className="p-3">
                <label className="text-xs text-muted-foreground">Lucro Líquido</label>
                <input
                  type="number"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  value={selectedPeriod.net_profit}
                  onChange={(e) => handlePeriodUpdate({ net_profit: Number(e.target.value) })}
                />
              </Card>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map((emp) => {
              const sc = scorecards.find((s) => s.employee_id === emp.id);
              const isOwnCard = sc?.user_id === user?.id;
              const canView = isAdmin || isOwnCard;
              return (
                <ScorecardCard
                  key={emp.id}
                  employee={emp}
                  scorecard={sc || null}
                  poolAmount={selectedPeriod.bonus_pool_amount}
                  numEmployees={employees.length}
                  isAdmin={isAdmin}
                  isBlurred={!canView}
                  onUpdate={handleScorecardUpdate}
                />
              );
            })}
            {employees.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                Nenhum colaborador ativo cadastrado. Adicione colaboradores no Administrativo.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Config Dialog */}
      {showConfig && selectedPeriod && (
        <PPRConfigDialog
          open={showConfig}
          onOpenChange={setShowConfig}
          period={selectedPeriod}
          onSave={handlePeriodUpdate}
        />
      )}
    </div>
  );
}
