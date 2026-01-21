import { useState } from "react";
import { Users, DollarSign, Briefcase, Target, Download } from "lucide-react";
import { ImportCard } from "@/components/import/ImportCard";
import { ImportUploader } from "@/components/import/ImportUploader";
import { ImportPreview } from "@/components/import/ImportPreview";
import { ImportResults } from "@/components/import/ImportResults";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateTemplate, ImportType } from "@/lib/import/templateGenerator";
import { parseImportFile, ParsedData } from "@/lib/import/excelParser";
import { 
  validateClients, 
  validatePayments, 
  validateExpenses, 
  validateSalaries, 
  validateLeads,
  ValidationError 
} from "@/lib/import/validators";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

type Step = 'select' | 'download' | 'upload' | 'preview' | 'results';

export default function Import() {
  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState({ success: 0, errors: 0 });
  const { toast } = useToast();
  const { currentAgency } = useAgency();

  const handleTypeSelect = (type: ImportType) => {
    setSelectedType(type);
    setStep('download');
  };

  const handleDownloadTemplate = () => {
    if (selectedType) {
      generateTemplate(selectedType);
      toast({
        title: "Template baixado!",
        description: "Preencha o template e faça o upload quando estiver pronto.",
      });
      setStep('upload');
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedType) return;
    
    setIsProcessing(true);
    try {
      // Parse file
      const data = await parseImportFile(file, selectedType);
      setParsedData(data);

      // Validate data
      const errors: ValidationError[] = [];
      
      if (selectedType === 'clients_and_payments') {
        if (data.clients) {
          const clientValidation = validateClients(data.clients);
          errors.push(...clientValidation.errors);
        }
        if (data.payments && data.clients) {
          const paymentValidation = validatePayments(data.payments, data.clients);
          errors.push(...paymentValidation.errors);
        }
      } else if (selectedType === 'expenses' && data.expenses) {
        const expenseValidation = validateExpenses(data.expenses);
        errors.push(...expenseValidation.errors);
      } else if (selectedType === 'salaries' && data.salaries) {
        const salaryValidation = validateSalaries(data.salaries);
        errors.push(...salaryValidation.errors);
      } else if (selectedType === 'leads' && data.leads) {
        const leadValidation = validateLeads(data.leads);
        errors.push(...leadValidation.errors);
      }

      setValidationErrors(errors);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Verifique se o arquivo está no formato correto.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Map Portuguese status to database enum values
  const mapStatus = (status: string): 'paid' | 'pending' | 'overdue' => {
    const statusMap: Record<string, 'paid' | 'pending' | 'overdue'> = {
      'PAGO': 'paid',
      'PENDENTE': 'pending',
      'ATRASADO': 'overdue'
    };
    return statusMap[status.toUpperCase()] || 'pending';
  };

  // Map Portuguese expense type to database enum values
  const mapExpenseType = (tipo: string): 'avulsa' | 'parcelada' | 'recorrente' => {
    const tipoMap: Record<string, 'avulsa' | 'parcelada' | 'recorrente'> = {
      'FIXA': 'recorrente',
      'AVULSA': 'avulsa',
      'PARCELADA': 'parcelada'
    };
    return tipoMap[tipo.toUpperCase()] || 'avulsa';
  };

  // Map Portuguese source to database values
  const mapSource = (origem: string): string => {
    const origemMap: Record<string, string> = {
      'SITE': 'site',
      'INDICACAO': 'indicacao',
      'GOOGLE_ADS': 'google_ads',
      'FACEBOOK_ADS': 'facebook_ads',
      'INSTAGRAM': 'instagram',
      'LINKEDIN': 'linkedin',
      'WHATSAPP': 'whatsapp',
      'MANUAL': 'manual'
    };
    return origemMap[origem.toUpperCase()] || 'manual';
  };

  // Map Portuguese temperature to database values (cold/warm/hot)
  const mapTemperature = (temperatura: string): 'cold' | 'warm' | 'hot' => {
    const temperaturaMap: Record<string, 'cold' | 'warm' | 'hot'> = {
      'FRIO': 'cold',
      'MORNO': 'warm',
      'QUENTE': 'hot'
    };
    return temperaturaMap[temperatura?.toUpperCase()] || 'cold';
  };

  // Map Portuguese lead status (etapa) to database values
  const mapLeadStatus = (etapa: string): string => {
    const statusMap: Record<string, string> = {
      'NOVO_LEAD': 'leads',
      'EM_CONTATO': 'em_contato',
      'EM CONTATO': 'em_contato',
      'QUALIFICADO': 'qualified',
      'AGENDAMENTO': 'scheduled',
      'REUNIAO': 'meeting',
      'PROPOSTA': 'proposal',
      'GANHO': 'won',
      'PERDIDO': 'lost'
    };
    return statusMap[etapa?.toUpperCase()] || 'leads';
  };

  const handleConfirmImport = async () => {
    if (!currentAgency || validationErrors.length > 0) return;

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Import clients and payments
      if (selectedType === 'clients_and_payments') {
        if (parsedData.clients) {
          const clientsToInsert = parsedData.clients.map(c => ({
            agency_id: currentAgency.id,
            name: c.nome,
            monthly_value: c.valorMensal,
            due_date: c.diaVencimento,
            start_date: c.dataInicio || null,
            contact: c.contato || null,
            service: c.servico || null,
            active: c.ativo === 'SIM',
            has_loyalty: c.temFidelidade === 'SIM',
            observations: c.observacoes || null
          }));

          // Get existing clients to check for duplicates and update
          const { data: existingClients } = await supabase
            .from('clients')
            .select('id, name')
            .eq('agency_id', currentAgency.id);

          const existingClientMap = new Map(
            (existingClients || []).map(c => [c.name.toLowerCase().trim(), c.id])
          );

          // Separate clients into new and existing
          const newClients = clientsToInsert.filter(
            c => !existingClientMap.has(c.name.toLowerCase().trim())
          );

          const existingClientsToUpdate = clientsToInsert.filter(
            c => existingClientMap.has(c.name.toLowerCase().trim())
          );

          let insertedClients: any[] = [];
          let updatedCount = 0;
          
          // Insert new clients
          if (newClients.length > 0) {
            const { data, error: clientError } = await supabase
              .from('clients')
              .insert(newClients)
              .select();

            if (clientError) throw clientError;
            insertedClients = data || [];
            successCount += insertedClients.length;
          }

          // Update existing clients
          if (existingClientsToUpdate.length > 0) {
            for (const client of existingClientsToUpdate) {
              const clientId = existingClientMap.get(client.name.toLowerCase().trim());
              if (!clientId) continue;

              // Only update fields that have values
              const updateData: any = {};
              if (client.monthly_value !== null && client.monthly_value !== undefined) {
                updateData.monthly_value = client.monthly_value;
              }
              if (client.due_date !== null && client.due_date !== undefined) {
                updateData.due_date = client.due_date;
              }
              if (client.contact) updateData.contact = client.contact;
              if (client.service) updateData.service = client.service;
              if (client.observations) updateData.observations = client.observations;
              updateData.has_loyalty = client.has_loyalty;
              updateData.active = client.active;
              updateData.updated_at = new Date().toISOString();

              const { error: updateError } = await supabase
                .from('clients')
                .update(updateData)
                .eq('id', clientId);

              if (updateError) {
                console.error('Error updating client:', updateError);
                errorCount++;
              } else {
                updatedCount++;
              }
            }
          }

          // Report results
          if (updatedCount > 0) {
            toast({
              title: "Clientes atualizados",
              description: `${updatedCount} cliente(s) existente(s) foram atualizados com os novos dados.`,
              variant: "default"
            });
          }

          // Create client map with all clients (existing + new)
          const allClients = [...(existingClients || []), ...insertedClients];
          const clientMap = new Map(
            allClients.map(c => [c.name.toLowerCase().trim(), c.id])
          );

          // Import payments
          if (parsedData.payments) {
            const paymentsToInsert = parsedData.payments.map(p => ({
              agency_id: currentAgency.id,
              client_id: clientMap.get(p.cliente.toLowerCase().trim()),
              amount: p.valor,
              due_date: p.vencimento,
              paid_date: p.dataPagamento || null,
              status: mapStatus(p.status)
            })).filter(p => p.client_id); // Only insert payments with valid clients

            if (paymentsToInsert.length > 0) {
              const { error: paymentError } = await supabase
                .from('client_payments')
                .insert(paymentsToInsert);

              if (paymentError) throw paymentError;
              successCount += paymentsToInsert.length;
            }
          }
        }
      }

      // Import expenses
      if (selectedType === 'expenses' && parsedData.expenses) {
        const expensesToInsert = parsedData.expenses.map(e => ({
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
          is_fixed: e.tipo === 'FIXA'
        }));

        const { error } = await supabase.from('expenses').insert(expensesToInsert);
        if (error) throw error;
        successCount += expensesToInsert.length;
      }

      // Import salaries
      if (selectedType === 'salaries' && parsedData.salaries) {
        const salariesToInsert = parsedData.salaries.map(s => ({
          agency_id: currentAgency.id,
          employee_name: s.funcionario,
          amount: s.valor,
          due_date: s.vencimento,
          paid_date: s.dataPagamento || null,
          status: mapStatus(s.status)
        }));

        const { error } = await supabase.from('salaries').insert(salariesToInsert);
        if (error) throw error;
        successCount += salariesToInsert.length;
      }

      // Import leads
      if (selectedType === 'leads' && parsedData.leads) {
        const leadsToInsert = parsedData.leads.map(l => ({
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
          notes: l.notas || null
        }));

        const { error } = await supabase.from('leads').insert(leadsToInsert);
        if (error) throw error;
        successCount += leadsToInsert.length;
      }

      // Log import
      await supabase.from('import_logs').insert([{
        agency_id: currentAgency.id,
        user_id: user.id,
        import_type: selectedType || 'unknown',
        total_rows: successCount + errorCount,
        success_count: successCount,
        error_count: errorCount,
        errors: validationErrors as any
      }]);

      setImportResults({ success: successCount, errors: errorCount });
      setStep('results');

      toast({
        title: "Importação concluída!",
        description: `${successCount} registros importados com sucesso.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro ao importar os dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('select');
    setSelectedType(null);
    setParsedData({});
    setValidationErrors([]);
    setImportResults({ success: 0, errors: 0 });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Importação de Dados</h1>
        <p className="text-muted-foreground">
          Importe seus dados existentes através de planilhas Excel
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2">
          {['select', 'download', 'upload', 'preview', 'results'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`
                h-10 w-10 rounded-full flex items-center justify-center font-semibold
                ${step === s ? 'bg-primary text-primary-foreground' : 
                  ['select', 'download', 'upload', 'preview', 'results'].indexOf(step) > index ? 
                  'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
              `}>
                {index + 1}
              </div>
              {index < 4 && (
                <div className={`h-0.5 w-12 ${
                  ['select', 'download', 'upload', 'preview', 'results'].indexOf(step) > index ? 
                  'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      {step === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImportCard
            icon={Users}
            title="Clientes & Pagamentos"
            description="Importe clientes e seus históricos de pagamentos"
            onClick={() => handleTypeSelect('clients_and_payments')}
          />
          <ImportCard
            icon={DollarSign}
            title="Despesas"
            description="Importe despesas fixas, avulsas e parceladas"
            onClick={() => handleTypeSelect('expenses')}
          />
          <ImportCard
            icon={Briefcase}
            title="Salários"
            description="Importe folha de pagamento e salários"
            onClick={() => handleTypeSelect('salaries')}
          />
          <ImportCard
            icon={Target}
            title="Leads"
            description="Importe seus leads e prospects do CRM"
            onClick={() => handleTypeSelect('leads')}
          />
        </div>
      )}

      {step === 'download' && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Baixar Template</CardTitle>
            <CardDescription>
              Baixe o template Excel e preencha com seus dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-muted rounded-lg space-y-4">
              <h3 className="font-semibold">Instruções:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Baixe o template clicando no botão abaixo</li>
                <li>Preencha todas as colunas obrigatórias (marcadas com *)</li>
                <li>Siga os formatos indicados nas instruções do template</li>
                <li>Salve o arquivo como .xlsx</li>
                <li>Faça o upload do arquivo preenchido</li>
              </ol>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleDownloadTemplate} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
              <Button onClick={() => setStep('upload')} className="flex-1">
                Continuar
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'upload' && (
        <div className="max-w-2xl mx-auto">
          <ImportUploader
            onFileSelect={handleFileSelect}
            onCancel={handleReset}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {step === 'preview' && (
        <ImportPreview
          data={parsedData}
          errors={validationErrors}
          onConfirm={handleConfirmImport}
          onCancel={handleReset}
        />
      )}

      {step === 'results' && (
        <ImportResults
          successCount={importResults.success}
          errorCount={importResults.errors}
          importType={selectedType || ''}
          onNewImport={handleReset}
        />
      )}
    </div>
  );
}
