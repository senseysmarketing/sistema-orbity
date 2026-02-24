import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Sparkles } from "lucide-react";
import { useContentPlanning, ContentPlan, WizardData, AIPlanResult } from "@/hooks/useContentPlanning";
import { ContentPlanCard } from "./ContentPlanCard";
import { ContentPlanWizard } from "./ContentPlanWizard";
import { ContentPlanPreview } from "./ContentPlanPreview";
import { ContentPlanDetailsSheet } from "./ContentPlanDetailsSheet";
import { WeeklySummaryDialog } from "./WeeklySummaryDialog";

export function ContentPlanningList() {
  const { plans, isLoading, generating, generatePlan, savePlan, createTasksFromItems, deletePlan, updatePlanItem, deletePlanItem, addPlanItem } = useContentPlanning();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId]);
  const [currentWizardData, setCurrentWizardData] = useState<WizardData | null>(null);
  const [currentPlanResult, setCurrentPlanResult] = useState<AIPlanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summaryPlan, setSummaryPlan] = useState<ContentPlan | null>(null);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (searchQuery && !(p.clients?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      return true;
    });
  }, [plans, searchQuery, statusFilter]);

  const handleGenerate = async (data: WizardData) => {
    setCurrentWizardData(data);
    const result = await generatePlan(data);
    if (result) {
      setCurrentPlanResult(result);
      setWizardOpen(false);
      setPreviewOpen(true);
    }
  };

  const handleSave = async () => {
    if (!currentWizardData || !currentPlanResult) return;
    setSaving(true);
    const planId = await savePlan(currentWizardData, currentPlanResult);
    setSaving(false);
    if (planId) {
      setPreviewOpen(false);
      setCurrentPlanResult(null);
      setCurrentWizardData(null);
    }
  };

  const handleSaveAndCreateTasks = async (selectedIndices: number[]) => {
    if (!currentWizardData || !currentPlanResult) return;
    setSaving(true);
    const planId = await savePlan(currentWizardData, currentPlanResult);
    if (planId) {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: savedItems } = await supabase
        .from("content_plan_items")
        .select("id")
        .eq("plan_id", planId)
        .order("day_number");

      if (savedItems) {
        const selectedIds = selectedIndices
          .filter((i) => i < savedItems.length)
          .map((i) => savedItems[i].id);
        await createTasksFromItems(planId, selectedIds, currentWizardData.assignedUserIds);
      }
      setPreviewOpen(false);
      setCurrentPlanResult(null);
      setCurrentWizardData(null);
    }
    setSaving(false);
  };

  const handleViewPlan = (plan: ContentPlan) => {
    setSelectedPlanId(plan.id);
    setDetailsEditMode(false);
    setDetailsOpen(true);
  };

  const handleEditPlan = (plan: ContentPlan) => {
    setSelectedPlanId(plan.id);
    setDetailsEditMode(true);
    setDetailsOpen(true);
  };

  const handleCreateTasksFromPlan = (plan: ContentPlan) => {
    setSelectedPlanId(plan.id);
    setDetailsEditMode(false);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar planejamento..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-full sm:w-[220px]" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setWizardOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Novo Planejamento
        </Button>
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium mb-1">Nenhum planejamento encontrado</p>
          <p className="text-sm text-muted-foreground mb-4">
            {plans.length === 0
              ? "Crie seu primeiro planejamento de conteúdo com IA"
              : "Tente ajustar os filtros de busca"}
          </p>
          {plans.length === 0 && (
            <Button onClick={() => setWizardOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Criar Planejamento
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => (
            <ContentPlanCard
              key={plan.id}
              plan={plan}
              onView={handleViewPlan}
              onEdit={handleEditPlan}
              onCreateTasks={handleCreateTasksFromPlan}
              onDelete={deletePlan}
              onCopyWeeklySummary={(p) => setSummaryPlan(p)}
            />
          ))}
        </div>
      )}

      {/* Wizard */}
      <ContentPlanWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />

      {/* Preview */}
      {currentPlanResult && currentWizardData && (
        <ContentPlanPreview
          open={previewOpen}
          onClose={() => { setPreviewOpen(false); setWizardOpen(true); }}
          planResult={currentPlanResult}
          wizardData={currentWizardData}
          onSave={handleSave}
          onSaveAndCreateTasks={handleSaveAndCreateTasks}
          saving={saving}
        />
      )}

      {/* Details sheet */}
      <ContentPlanDetailsSheet
        plan={selectedPlan}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onCreateTasks={createTasksFromItems}
        editMode={detailsEditMode}
        onUpdateItem={updatePlanItem}
        onDeleteItem={deletePlanItem}
        onAddItem={addPlanItem}
      />

      {/* Weekly summary */}
      <WeeklySummaryDialog
        plan={summaryPlan}
        open={!!summaryPlan}
        onClose={() => setSummaryPlan(null)}
      />
    </div>
  );
}
