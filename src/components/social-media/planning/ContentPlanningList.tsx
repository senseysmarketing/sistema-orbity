import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, PenLine, Search, Sparkles } from "lucide-react";
import { useContentPlanning, AIPlanResult, ContentPlan, ManualPlanInput, WizardData } from "@/hooks/useContentPlanning";
import { ContentPlanCard } from "./ContentPlanCard";
import { ContentPlanWizard } from "./ContentPlanWizard";
import { ContentPlanPreview } from "./ContentPlanPreview";
import { ContentPlanDetailsSheet } from "./ContentPlanDetailsSheet";
import { WeeklySummaryDialog } from "./WeeklySummaryDialog";
import { ManualContentPlanDialog } from "./ManualContentPlanDialog";

export function ContentPlanningList() {
  const {
    plans,
    isLoading,
    generating,
    generatePlan,
    savePlan,
    createManualPlan,
    createTasksFromItems,
    deletePlan,
    updatePlanItem,
    deletePlanItem,
    addPlanItem,
    duplicatePlanItem,
  } = useContentPlanning();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentWizardData, setCurrentWizardData] = useState<WizardData | null>(null);
  const [currentPlanResult, setCurrentPlanResult] = useState<AIPlanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [summaryPlan, setSummaryPlan] = useState<ContentPlan | null>(null);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) || null, [plans, selectedPlanId]);

  const filteredPlans = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return plans.filter((plan) => {
      if (query && !(plan.clients?.name || "").toLowerCase().includes(query) && !plan.title.toLowerCase().includes(query)) return false;
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;
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
        .order("order_position");

      if (savedItems) {
        const selectedIds = selectedIndices
          .filter((index) => index < savedItems.length)
          .map((index) => savedItems[index].id);
        await createTasksFromItems(planId, selectedIds, currentWizardData.assignedUserIds);
      }
      setPreviewOpen(false);
      setCurrentPlanResult(null);
      setCurrentWizardData(null);
    }
    setSaving(false);
  };

  const handleCreateManualPlan = async (input: ManualPlanInput) => {
    setManualSaving(true);
    const planId = await createManualPlan(input);
    setManualSaving(false);
    if (planId) {
      setSelectedPlanId(planId);
      setDetailsEditMode(true);
      setDetailsOpen(true);
    }
    return planId;
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar planejamento..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-8 w-full sm:w-[220px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="completed">Concluidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Novo Planejamento
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setWizardOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Criar com IA
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setManualOpen(true)}>
              <PenLine className="h-4 w-4 mr-2" />
              Criar manualmente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[180px]" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium mb-1">Nenhum planejamento encontrado</p>
          <p className="text-sm text-muted-foreground mb-4">
            {plans.length === 0 ? "Crie seu primeiro planejamento com IA ou manualmente" : "Tente ajustar os filtros de busca"}
          </p>
          {plans.length === 0 && (
            <Button onClick={() => setManualOpen(true)}>
              <PenLine className="h-4 w-4 mr-2" />
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
              onCopyWeeklySummary={(selected) => setSummaryPlan(selected)}
            />
          ))}
        </div>
      )}

      <ContentPlanWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />

      <ManualContentPlanDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onCreate={handleCreateManualPlan}
        saving={manualSaving}
      />

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

      <ContentPlanDetailsSheet
        plan={selectedPlan}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onCreateTasks={createTasksFromItems}
        editMode={detailsEditMode}
        onUpdateItem={updatePlanItem}
        onDeleteItem={deletePlanItem}
        onAddItem={addPlanItem}
        onDuplicateItem={duplicatePlanItem}
      />

      <WeeklySummaryDialog
        plan={summaryPlan}
        open={!!summaryPlan}
        onClose={() => setSummaryPlan(null)}
      />
    </div>
  );
}
