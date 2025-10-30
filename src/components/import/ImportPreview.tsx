import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Download } from "lucide-react";
import { ValidationError } from "@/lib/import/validators";
import * as XLSX from 'xlsx';

interface ImportPreviewProps {
  data: {
    clients?: any[];
    payments?: any[];
    expenses?: any[];
    salaries?: any[];
    leads?: any[];
  };
  errors: ValidationError[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreview({ data, errors, onConfirm, onCancel }: ImportPreviewProps) {
  const hasClients = data.clients && data.clients.length > 0;
  const hasPayments = data.payments && data.payments.length > 0;
  const hasExpenses = data.expenses && data.expenses.length > 0;
  const hasSalaries = data.salaries && data.salaries.length > 0;
  const hasLeads = data.leads && data.leads.length > 0;

  const totalRecords = 
    (data.clients?.length || 0) + 
    (data.payments?.length || 0) + 
    (data.expenses?.length || 0) + 
    (data.salaries?.length || 0) + 
    (data.leads?.length || 0);

  const exportErrors = () => {
    const ws = XLSX.utils.json_to_sheet(errors.map(e => ({
      Linha: e.row,
      Aba: e.sheet,
      Campo: e.field,
      Erro: e.message,
      Valor: e.value
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erros');
    XLSX.writeFile(wb, `erros_importacao_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderTable = (items: any[], maxRows: number = 10) => {
    if (!items || items.length === 0) return null;
    
    const displayItems = items.slice(0, maxRows);
    const headers = Object.keys(displayItems[0]);

    return (
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="whitespace-nowrap">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map((item, index) => (
              <TableRow key={index}>
                {headers.map((header) => (
                  <TableCell key={header} className="whitespace-nowrap">
                    {String(item[header] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length > maxRows && (
          <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
            Mostrando {maxRows} de {items.length} registros
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Importação</CardTitle>
          <CardDescription>
            Verifique os dados antes de confirmar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalRecords}</p>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-green-500/5 rounded-lg">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalRecords - errors.length}</p>
                <p className="text-sm text-muted-foreground">Válidos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-destructive/5 rounded-lg">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{errors.length}</p>
                <p className="text-sm text-muted-foreground">Com Erros</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {errors.length} {errors.length === 1 ? 'erro encontrado' : 'erros encontrados'}. 
              Corrija os erros antes de importar.
            </span>
            <Button variant="outline" size="sm" onClick={exportErrors}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Erros
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Error List */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes dos Erros</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {errors.map((error, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      <Badge variant="outline" className="mr-2">{error.sheet}</Badge>
                      Linha {error.row} - {error.field}
                    </p>
                    <p className="text-sm text-muted-foreground">{error.message}</p>
                    {error.value && (
                      <p className="text-xs text-muted-foreground">Valor: {String(error.value)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview dos Dados</CardTitle>
          <CardDescription>
            Primeiras linhas de cada aba
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={hasClients ? "clients" : hasExpenses ? "expenses" : hasSalaries ? "salaries" : "leads"}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              {hasClients && <TabsTrigger value="clients">Clientes ({data.clients?.length})</TabsTrigger>}
              {hasPayments && <TabsTrigger value="payments">Pagamentos ({data.payments?.length})</TabsTrigger>}
              {hasExpenses && <TabsTrigger value="expenses">Despesas ({data.expenses?.length})</TabsTrigger>}
              {hasSalaries && <TabsTrigger value="salaries">Salários ({data.salaries?.length})</TabsTrigger>}
              {hasLeads && <TabsTrigger value="leads">Leads ({data.leads?.length})</TabsTrigger>}
            </TabsList>

            {hasClients && (
              <TabsContent value="clients" className="mt-4">
                {renderTable(data.clients!)}
              </TabsContent>
            )}
            
            {hasPayments && (
              <TabsContent value="payments" className="mt-4">
                {renderTable(data.payments!)}
              </TabsContent>
            )}
            
            {hasExpenses && (
              <TabsContent value="expenses" className="mt-4">
                {renderTable(data.expenses!)}
              </TabsContent>
            )}
            
            {hasSalaries && (
              <TabsContent value="salaries" className="mt-4">
                {renderTable(data.salaries!)}
              </TabsContent>
            )}
            
            {hasLeads && (
              <TabsContent value="leads" className="mt-4">
                {renderTable(data.leads!)}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onConfirm} disabled={errors.length > 0}>
          Confirmar Importação
        </Button>
      </div>
    </div>
  );
}
