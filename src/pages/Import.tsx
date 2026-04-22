import { useState } from "react";
import { Users, DollarSign, Briefcase, Target, Download } from "lucide-react";
import { ImportCard } from "@/components/import/ImportCard";
import { ImportUploader } from "@/components/import/ImportUploader";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportResults } from "@/components/import/ImportResults";
import { SmartMappingPreview } from "@/components/import/SmartMappingPreview";
import { SyncOptionsStep } from "@/components/import/SyncOptionsStep";
import { ImportProgressStep, ImportJob } from "@/components/import/ImportProgressStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateTemplate, ImportType } from "@/lib/import/templateGenerator";
import { parseImportFile, ParsedData } from "@/lib/import/excelParser";
import {
  validateExpenses,
  validateSalaries,
  validateLeads,
  ValidationError,
} from "@/lib/import/validators";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

type Step = "select" | "download" | "upload" | "mapping" | "sync" | "progress" | "preview" | "results";

export default function Import() {
  const [step, setStep] = useState<Step>("select");
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState({
    success: 0,
    errors: 0,
    synced: 0,
    skipped: 0,
    showGateway: false,
  });
  const [validClientRows, setValidClientRows] = useState<any[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentAgency } = useAgency();

  const isClientsFlow = selectedType === "clients_and_payments";

  const handleTypeSelect = (type: ImportType) => {
    setSelectedType(type);
    setStep("download");
  };

  const handleDownloadTemplate = () => {
    if (selectedType) {
      generateTemplate(selectedType);
      toast({ title: "Template baixado!", description: "Preencha o template e faça o upload." });
      setStep("upload");
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedType) return;
    setIsProcessing(true);
    try {
      const data = await parseImportFile(file, selectedType);
      setParsedData(data);

      if (isClientsFlow) {
        setStep("mapping");
        return;
      }

      const errors: ValidationError[] = [];
      if (selectedType === "expenses" && data.expenses) errors.push(...validateExpenses(data.expenses).errors);
      else if (selectedType === "salaries" && data.salaries) errors.push(...validateSalaries(data.salaries).errors);
      else if (selectedType === "leads" && data.leads) errors.push(...validateLeads(data.leads).errors);

      setValidationErrors(errors);
      setStep("preview");
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({ title: "Erro ao processar arquivo", description: "Verifique o formato.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const mapStatus = (s: string): "paid" | "pending" | "overdue" =>
    ({ PAGO: "paid", PENDENTE: "pending", ATRASADO: "overdue" }[s.toUpperCase()] as any) || "pending";
  const mapExpenseType = (t: string): "avulsa" | "parcelada" | "recorrente" =>
    ({ FIXA: "recorrente", AVULSA: "avulsa", PARCELADA: "parcelada" }[t.toUpperCase()] as any) || "avulsa";
  const mapSource = (o: string) =>
    ({ SITE: "site", INDICACAO: "indicacao", GOOGLE_ADS: "google_ads", FACEBOOK_ADS: "facebook_ads", INSTAGRAM: "instagram", LINKEDIN: "linkedin", WHATSAPP: "whatsapp", MANUAL: "manual" } as any)[o.toUpperCase()] || "manual";
  const mapTemperature = (t: string): "cold" | "warm" | "hot" =>
    ({ FRIO: "cold", MORNO: "warm", QUENTE: "hot" } as any)[t?.toUpperCase()] || "cold";
  const mapLeadStatus = (e: string) =>
    ({ NOVO_LEAD: "leads", QUALIFICADO: "qualified", AGENDAMENTO: "scheduled", REUNIAO: "meeting", PROPOSTA: "proposal", GANHO: "won", PERDIDO: "lost" } as any)[e?.toUpperCase()] || "leads";

  const handleStartBatchImport = async ({ syncGateway, addToMrr }: { syncGateway: boolean; addToMrr: boolean }) => {
    if (!currentAgency) return;
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: job, error: jobErr } = await supabase
        .from("import_jobs")
        .insert({
          agency_id: currentAgency.id,
          user_id: user.id,
          total_rows: validClientRows.length,
          sync_gateway: syncGateway,
          add_to_mrr: addToMrr,
        })
        .select("id")
        .single();

      if (jobErr || !job) throw jobErr || new Error("Falha ao criar job");

      setJobId(job.id);
      setStep("progress");

      // Fire-and-forget edge function
      supabase.functions
        .invoke("process-batch-import", {
          body: {
            agency_id: currentAgency.id,
            job_id: job.id,
            rows: validClientRows,
            sync_gateway: syncGateway,
            add_to_mrr: addToMrr,
          },
        })
        .catch((e) => console.error("[batch-import] invoke error", e));
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao iniciar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJobDone = (job: ImportJob) => {
    setImportResults({
      success: job.success_count,
      errors: job.error_count,
      synced: job.gateway_synced_count,
      skipped: job.gateway_skipped_count,
      showGateway: job.sync_gateway,
    });
    setStep("results");
    toast({ title: "Importação concluída!", description: `${job.success_count} registros processados.` });
  };

  const handleConfirmImport = async () => {
    if (!currentAgency || validationErrors.length > 0) return;
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (selectedType === "expenses" && parsedData.expenses) {
        const expensesToInsert = parsedData.expenses.map((e) => ({
          agency_id: currentAgency.id,
          name: e.nome,
          amount: e.valor,
          due_date: e.vencimento,
          category: e.categoria || null,
          expense_type: mapExpenseType(e.tipo),
          status: mapStatus(e.status),
          description: e.descricao || null,
          installment_total: e.parcelas || null,
          recurrence_day: e.diaRecorrencia || null,
          is_fixed: e.tipo === "FIXA",
        }));
        const { error } = await supabase.from("expenses").insert(expensesToInsert);
        if (error) throw error;
        successCount += expensesToInsert.length;
      }

      if (selectedType === "salaries" && parsedData.salaries) {
        const salariesToInsert = parsedData.salaries.map((s) => ({
          agency_id: currentAgency.id,
          employee_name: s.funcionario,
          amount: s.valor,
          due_date: s.vencimento,
          paid_date: s.dataPagamento || null,
          status: mapStatus(s.status),
        }));
        const { error } = await supabase.from("salaries").insert(salariesToInsert);
        if (error) throw error;
        successCount += salariesToInsert.length;
      }

      if (selectedType === "leads" && parsedData.leads) {
        const leadsToInsert = parsedData.leads.map((l) => ({
          agency_id: currentAgency.id,
          created_by: user.id,
          name: l.nome,
          email: l.email || null,
          phone: l.telefone || null,
          company: l.empresa || null,
          position: l.cargo || null,
          source: mapSource(l.origem),
          status: mapLeadStatus(l.etapa),
          temperature: mapTemperature(l.temperatura),
          value: l.valorEstimado || 0,
          notes: l.notas || null,
        }));
        const { error } = await supabase.from("leads").insert(leadsToInsert);
        if (error) throw error;
        successCount += leadsToInsert.length;
      }

      await supabase.from("import_logs").insert([{
        agency_id: currentAgency.id,
        user_id: user.id,
        import_type: selectedType || "unknown",
        total_rows: successCount + errorCount,
        success_count: successCount,
        error_count: errorCount,
        errors: validationErrors as any,
      }]);

      setImportResults({ success: successCount, errors: errorCount, synced: 0, skipped: 0, showGateway: false });
      setStep("results");
      toast({ title: "Importação concluída!", description: `${successCount} registros importados.` });
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: "Erro na importação", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep("select");
    setSelectedType(null);
    setParsedData({});
    setValidationErrors([]);
    setImportResults({ success: 0, errors: 0, synced: 0, skipped: 0, showGateway: false });
    setValidClientRows([]);
    setJobId(null);
  };

  // Build dynamic step list per flow
  const steps: Step[] = isClientsFlow
    ? ["select", "download", "upload", "mapping", "sync", "progress", "results"]
    : ["select", "download", "upload", "preview", "results"];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Importação de Dados</h1>
        <p className="text-muted-foreground">Importe seus dados existentes através de planilhas Excel</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`
                h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s ? "bg-primary text-primary-foreground"
                  : steps.indexOf(step) > index ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"}
              `}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-px w-10 ${steps.indexOf(step) > index ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {step === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImportCard icon={Users} title="Clientes & Pagamentos" description="Importe clientes com Smart Mapping e sincronização de gateway" onClick={() => handleTypeSelect("clients_and_payments")} />
          <ImportCard icon={DollarSign} title="Despesas" description="Importe despesas fixas, avulsas e parceladas" onClick={() => handleTypeSelect("expenses")} />
          <ImportCard icon={Briefcase} title="Salários" description="Importe folha de pagamento" onClick={() => handleTypeSelect("salaries")} />
          <ImportCard icon={Target} title="Leads" description="Importe leads e prospects do CRM" onClick={() => handleTypeSelect("leads")} />
        </div>
      )}

      {step === "download" && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Baixar Template</CardTitle>
            <CardDescription>Baixe o template Excel e preencha com seus dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-muted rounded-lg space-y-4">
              <h3 className="font-semibold">Instruções:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Baixe o template clicando no botão abaixo</li>
                <li>Preencha as colunas obrigatórias (marcadas com *)</li>
                <li>Salve como .xlsx</li>
                <li>Faça o upload do arquivo preenchido</li>
              </ol>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownloadTemplate} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" /> Baixar Template
              </Button>
              <Button onClick={() => setStep("upload")} className="flex-1">Continuar</Button>
              <Button variant="outline" onClick={handleReset}>Voltar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <div className="max-w-2xl mx-auto">
          <ImportUploader onFileSelect={handleFileSelect} onCancel={handleReset} isProcessing={isProcessing} />
        </div>
      )}

      {step === "mapping" && isClientsFlow && parsedData.clientsRaw && parsedData.clientsHeaders && (
        <SmartMappingPreview
          rawRows={parsedData.clientsRaw}
          headers={parsedData.clientsHeaders}
          onCancel={() => setStep("upload")}
          onContinue={(rows) => {
            setValidClientRows(rows);
            setStep("sync");
          }}
        />
      )}

      {step === "sync" && isClientsFlow && currentAgency && (
        <SyncOptionsStep
          agencyId={currentAgency.id}
          rows={validClientRows}
          onBack={() => setStep("mapping")}
          onStart={handleStartBatchImport}
        />
      )}

      {step === "progress" && jobId && (
        <ImportProgressStep jobId={jobId} onDone={handleJobDone} />
      )}

      {step === "preview" && !isClientsFlow && (
        <ImportPreview data={parsedData} errors={validationErrors} onConfirm={handleConfirmImport} onCancel={handleReset} />
      )}

      {step === "results" && (
        <ImportResults
          successCount={importResults.success}
          errorCount={importResults.errors}
          importType={selectedType || ""}
          onNewImport={handleReset}
          gatewaySyncedCount={importResults.synced}
          gatewaySkippedCount={importResults.skipped}
          showGatewaySection={importResults.showGateway}
        />
      )}
    </div>
  );
}
