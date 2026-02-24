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
import { Gift, Plus, Settings2, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, parseISO, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface MonthlyFinancial {
  month: Date;
  label: string;
  revenue: number;
  expenses: number;
  salaries: number;
  netProfit: number;
  bonusPool: number;
  isFuture: boolean;
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
  const [configMode, setConfigMode] = useState<"create" | "edit">("edit");
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyFinancial[]>([]);

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

  useEffect(() => {
    if (selectedPeriod && agencyId) {
      fetchFinancialData();
    }
  }, [selectedPeriod?.id, agencyId]);

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

  const fetchFinancialData = async () => {
    if (!selectedPeriod || !agencyId) return;

    const startDate = parseISO(selectedPeriod.start_date);
    const endDate = parseISO(selectedPeriod.end_date);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const poolPercent = selectedPeriod.bonus_pool_percent || 10;
    const results: MonthlyFinancial[] = [];

    for (const month of months) {
      const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");
      const monthIsFuture = isFuture(endOfMonth(month));

      const [paymentsRes, expensesRes, salariesRes] = await Promise.all([
        supabase
          .from("client_payments")
          .select("amount")
          .eq("agency_id", agencyId)
          .eq("status", "paid")
          .gte("due_date", monthStart)
          .lte("due_date", monthEnd),
        supabase
          .from("expenses")
          .select("amount")
          .eq("agency_id", agencyId)
          .eq("status", "paid")
          .gte("due_date", monthStart)
          .lte("due_date", monthEnd),
        supabase
          .from("salaries")
          .select("amount")
          .eq("agency_id", agencyId)
          .eq("status", "paid")
          .gte("due_date", monthStart)
          .lte("due_date", monthEnd),
      ]);

      const revenue = (paymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const expensesTotal = (expensesRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const salariesTotal = (salariesRes.data || []).reduce((sum, s) => sum + (s.amount || 0), 0);
      const netProfit = revenue - expensesTotal - salariesTotal;
      const bonusPool = Math.max(0, netProfit * (poolPercent / 100));

      results.push({
        month,
        label: format(month, "MMMM", { locale: ptBR }),
        revenue,
        expenses: expensesTotal,
        salaries: salariesTotal,
        netProfit,
        bonusPool,
        isFuture: monthIsFuture && revenue === 0,
      });
    }

    setMonthlyData(results);

    // Update period totals
    const totalProfit = results.reduce((s, m) => s + m.netProfit, 0);
    const totalPool = results.reduce((s, m) => s + m.bonusPool, 0);

    // Get last month's revenue as the "recurring" reference
    const lastMonthWithData = [...results].reverse().find((m) => m.revenue > 0);
    const currentRecurringRevenue = lastMonthWithData?.revenue || 0;

    await supabase
      .from("bonus_periods")
      .update({
        revenue_actual: currentRecurringRevenue,
        net_profit: totalProfit,
        bonus_pool_amount: totalPool,
      } as Record<string, unknown>)
      .eq("id", selectedPeriodId);

    setPeriods((prev) =>
      prev.map((p) =>
        p.id === selectedPeriodId
          ? { ...p, revenue_actual: currentRecurringRevenue, net_profit: totalProfit, bonus_pool_amount: totalPool }
          : p
      )
    );
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

  const handleCreatePeriod = () => {
    setConfigMode("create");
    setShowConfig(true);
  };

  const handleCreateFromDialog = async (data: Record<string, unknown>) => {
    const { error } = await supabase.from("bonus_periods").insert([{
      agency_id: agencyId,
      program_id: program.id,
      label: data.label as string,
      start_date: data.start_date as string,
      end_date: data.end_date as string,
      revenue_target: data.revenue_target as number,
      bonus_pool_percent: data.bonus_pool_percent as number,
      nps_target: data.nps_target as number,
    }]);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Período criado!" });
      fetchPeriods();
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriodId) return;
    const { error } = await supabase
      .from("bonus_periods")
      .delete()
      .eq("id", selectedPeriodId);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Período excluído!" });
      const remaining = periods.filter((p) => p.id !== selectedPeriodId);
      setPeriods(remaining);
      setSelectedPeriodId(remaining[0]?.id || "");
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

    const period = { ...selectedPeriod, ...updates };
    const poolAmount = (period.net_profit || 0) * ((period.bonus_pool_percent || 10) / 100);

    await supabase
      .from("bonus_periods")
      .update({ ...updates, bonus_pool_amount: poolAmount } as Record<string, unknown>)
      .eq("id", selectedPeriodId);

    fetchPeriods();
    fetchScorecards();
    // Re-fetch financial data if dates or pool percent changed
    if (updates.start_date || updates.end_date || updates.bonus_pool_percent) {
      setTimeout(() => fetchFinancialData(), 500);
    }
  };

  // Totals from monthly data
  const totals = useMemo(() => {
    const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
    const totalProfit = monthlyData.reduce((s, m) => s + m.netProfit, 0);
    const totalPool = monthlyData.reduce((s, m) => s + m.bonusPool, 0);
    const lastWithData = [...monthlyData].reverse().find((m) => m.revenue > 0);
    return { totalRevenue, totalProfit, totalPool, currentRecurring: lastWithData?.revenue || 0 };
  }, [monthlyData]);

  const revenueProgress = selectedPeriod
    ? Math.min(100, (totals.currentRecurring / (selectedPeriod.revenue_target || 1)) * 100)
    : 0;

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
            Criar Período
          </Button>
        )}
      </div>
    );
  }

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
            <Button variant="ghost" size="sm" onClick={() => { setConfigMode("edit"); setShowConfig(true); }}>
              <Settings2 className="h-4 w-4 mr-1" /> Configurar
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDeletePeriod}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
        {selectedPeriod && (
          <Badge variant={selectedPeriod.status === "open" ? "default" : "secondary"}>
            {selectedPeriod.status === "open" ? "Aberto" : "Encerrado"}
          </Badge>
        )}
      </div>

      {/* BLOCO 1: Placar Financeiro - Tabela Mensal */}
      {selectedPeriod && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">📊 Placar Financeiro</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground min-w-[180px]">Indicador</th>
                      {monthlyData.map((m) => (
                        <th key={m.label} className="text-center p-3 font-medium text-muted-foreground capitalize min-w-[120px]">
                          {m.label}
                        </th>
                      ))}
                      <th className="text-center p-3 font-medium text-foreground min-w-[150px] bg-muted/80">
                        Total Período
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Faturamento */}
                    <tr className="border-b">
                      <td className="p-3 font-medium text-foreground">💰 Faturamento (R$)</td>
                      {monthlyData.map((m) => (
                        <td key={m.label} className="text-center p-3">
                          {m.isFuture ? (
                            <span className="text-muted-foreground text-xs">Aguardando</span>
                          ) : (
                            <span className="font-medium text-foreground">{formatCurrency(m.revenue)}</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center p-3 bg-muted/30">
                        <div className="font-bold text-foreground">{formatCurrency(totals.currentRecurring)}</div>
                        <div className="text-xs text-muted-foreground">Meta: {formatCurrency(selectedPeriod.revenue_target)}</div>
                      </td>
                    </tr>

                    {/* Lucro Líquido */}
                    <tr className="border-b">
                      <td className="p-3 font-medium text-foreground">📈 Lucro Líquido (R$)</td>
                      {monthlyData.map((m) => (
                        <td key={m.label} className="text-center p-3">
                          {m.isFuture ? (
                            <span className="text-muted-foreground text-xs">Aguardando</span>
                          ) : (
                            <span className={`font-medium ${m.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                              {formatCurrency(m.netProfit)}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="text-center p-3 bg-muted/30">
                        <span className={`font-bold ${totals.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                          {formatCurrency(totals.totalProfit)}
                        </span>
                      </td>
                    </tr>

                    {/* Pote de Bônus */}
                    <tr className="border-b">
                      <td className="p-3 font-medium text-foreground">🎁 Pote de Bônus ({selectedPeriod.bonus_pool_percent}%)</td>
                      {monthlyData.map((m) => (
                        <td key={m.label} className="text-center p-3">
                          {m.isFuture ? (
                            <span className="text-muted-foreground text-xs">Aguardando</span>
                          ) : (
                            <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(m.bonusPool)}</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center p-3 bg-muted/30">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(totals.totalPool)}
                        </span>
                      </td>
                    </tr>

                    {/* NPS */}
                    <tr>
                      <td className="p-3 font-medium text-foreground">⭐ NPS Geral</td>
                      {monthlyData.map((m) => (
                        <td key={m.label} className="text-center p-3">
                          {m.isFuture ? (
                            <span className="text-muted-foreground text-xs">Aguardando</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center p-3 bg-muted/30">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-foreground">{npsStats.nps}</span>
                          <Badge
                            variant={npsStats.nps >= (selectedPeriod.nps_target || 60) ? "default" : "destructive"}
                            className={`text-xs ${npsStats.nps >= (selectedPeriod.nps_target || 60) ? "bg-emerald-500" : ""}`}
                          >
                            Meta: &gt; {selectedPeriod.nps_target}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Progress bar */}
              <div className="p-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    Progresso da meta de faturamento recorrente
                  </span>
                  <span className="text-xs font-medium text-foreground">{Math.round(revenueProgress)}%</span>
                </div>
                <Progress value={revenueProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
      {showConfig && (
        <PPRConfigDialog
          open={showConfig}
          onOpenChange={setShowConfig}
          mode={configMode}
          period={configMode === "edit" && selectedPeriod ? selectedPeriod : undefined}
          onSave={configMode === "create" ? handleCreateFromDialog : handlePeriodUpdate}
          onDelete={configMode === "edit" ? handleDeletePeriod : undefined}
        />
      )}
    </div>
  );
}
