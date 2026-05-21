import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Trophy, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAgency } from "@/hooks/useAgency";
import { useBonusPeriods } from "@/hooks/useBonusPeriods";
import { usePPRMutations } from "@/hooks/usePPRMutations";
import { PPRPeriodSelector } from "./PPRPeriodSelector";
import { PPRPeriodDialog } from "./PPRPeriodDialog";
import { PPRActionsBar } from "./PPRActionsBar";
import { CalculationStatusBadge } from "./CalculationStatusBadge";
import { PPROverviewTab } from "./tabs/PPROverviewTab";
import { PPRFinancialTab } from "./tabs/PPRFinancialTab";
import { PPRAdjustmentsTab } from "./tabs/PPRAdjustmentsTab";
import { PPRBonusTab } from "./tabs/PPRBonusTab";
import { PPRScorecardsTab } from "./tabs/PPRScorecardsTab";
import { PPRAuditTab } from "./tabs/PPRAuditTab";
import { PPRNpsTab } from "./tabs/PPRNpsTab";

interface Props {
  programId: string;
  isAdmin: boolean;
}

const TABS = [
  { value: "overview", label: "Visão Geral" },
  { value: "financial", label: "Financeiro" },
  { value: "adjustments", label: "Ajustes" },
  { value: "bonus", label: "Bônus" },
  { value: "scorecards", label: "Scorecards" },
  { value: "nps", label: "NPS" },
  { value: "audit", label: "Auditoria" },
];

export function PerformancePPRPage({ programId, isAdmin }: Props) {
  const { currentAgency } = useAgency();
  const { data: periods = [], isLoading } = useBonusPeriods(programId);
  const { create, update, remove } = usePPRMutations(programId);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [tab, setTab] = useState(initialTab);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  // Auto-select most recent open or most recent
  useEffect(() => {
    if (!selectedId && periods.length > 0) {
      const open = periods.find((p) => p.status !== "closed");
      setSelectedId((open ?? periods[0]).id);
    }
  }, [periods, selectedId]);

  // Sync tab to URL
  useEffect(() => {
    const sp = new URLSearchParams(searchParams);
    if (tab === "overview") sp.delete("tab"); else sp.set("tab", tab);
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const selected = useMemo(
    () => periods.find((p) => p.id === selectedId) ?? null,
    [periods, selectedId]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Performance & PPR</h1>
            <p className="text-sm text-muted-foreground">
              {selected ? selected.label : "Selecione ou crie um período"}
            </p>
          </div>
          {selected && (
            <CalculationStatusBadge
              status={selected.calculation_status}
              calculatedAt={selected.calculated_at}
              error={selected.calculation_error}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <PPRPeriodSelector periods={periods} selectedId={selectedId} onSelect={setSelectedId} />

          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setDialogMode("create"); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo
              </Button>
              {selected && selected.status !== "closed" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => { setDialogMode("edit"); setDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir período?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Todos os scorecards, ajustes e cálculos vinculados serão excluídos. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            remove.mutate(selected.id, {
                              onSuccess: () => setSelectedId(null),
                            });
                          }}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </>
          )}

          {selected && <PPRActionsBar period={selected} isAdmin={isAdmin} />}
        </div>
      </div>

      {!selected && periods.length === 0 && (
        <div className="text-center py-16 space-y-2 border-2 border-dashed rounded-lg">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-medium">Nenhum período cadastrado</h3>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Crie um período para começar." : "Aguarde o administrador configurar um período."}
          </p>
        </div>
      )}

      {selected && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-6"><PPROverviewTab period={selected} /></TabsContent>
          <TabsContent value="financial" className="mt-6"><PPRFinancialTab period={selected} /></TabsContent>
          <TabsContent value="adjustments" className="mt-6"><PPRAdjustmentsTab period={selected} isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="bonus" className="mt-6"><PPRBonusTab period={selected} /></TabsContent>
          <TabsContent value="scorecards" className="mt-6"><PPRScorecardsTab period={selected} isAdmin={isAdmin} /></TabsContent>
          <TabsContent value="nps" className="mt-6"><PPRNpsTab /></TabsContent>
          <TabsContent value="audit" className="mt-6"><PPRAuditTab period={selected} /></TabsContent>
        </Tabs>
      )}

      <PPRPeriodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        programId={programId}
        period={dialogMode === "edit" ? selected : null}
        onSave={async (input) => {
          if (dialogMode === "create") {
            const created = await create.mutateAsync(input);
            if (created?.id) setSelectedId(created.id);
          } else if (selected) {
            await update.mutateAsync({ id: selected.id, updates: input });
          }
        }}
      />
    </div>
  );
}
