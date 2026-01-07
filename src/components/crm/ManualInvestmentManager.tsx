import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { useCRMInvestments, INVESTMENT_SOURCES, CRMInvestment } from "@/hooks/useCRMInvestments";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ManualInvestmentManager() {
  const [referenceMonth] = useState(startOfMonth(new Date()));
  const { investments, loading, totalManualInvestment, addInvestment, updateInvestment, deleteInvestment } = useCRMInvestments(referenceMonth);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<CRMInvestment | null>(null);
  
  // Form state
  const [formSource, setFormSource] = useState("");
  const [formSourceName, setFormSourceName] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setFormSource("");
    setFormSourceName("");
    setFormAmount("");
    setFormNotes("");
  };

  const handleAdd = async () => {
    if (!formSource || !formAmount) return;
    
    setIsSaving(true);
    const result = await addInvestment({
      source: formSource,
      source_name: formSourceName || undefined,
      amount: parseFloat(formAmount),
      notes: formNotes || undefined,
    });
    setIsSaving(false);
    
    if (result) {
      resetForm();
      setIsAddDialogOpen(false);
    }
  };

  const handleEdit = async () => {
    if (!editingInvestment || !formSource || !formAmount) return;
    
    setIsSaving(true);
    const result = await updateInvestment(editingInvestment.id, {
      source: formSource,
      source_name: formSourceName || null,
      amount: parseFloat(formAmount),
      notes: formNotes || null,
    });
    setIsSaving(false);
    
    if (result) {
      resetForm();
      setEditingInvestment(null);
    }
  };

  const openEditDialog = (investment: CRMInvestment) => {
    setFormSource(investment.source);
    setFormSourceName(investment.source_name || "");
    setFormAmount(investment.amount.toString());
    setFormNotes(investment.notes || "");
    setEditingInvestment(investment);
  };

  const handleDelete = async (id: string) => {
    await deleteInvestment(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getSourceLabel = (source: string) => {
    return INVESTMENT_SOURCES.find(s => s.value === source)?.label || source;
  };

  const InvestmentForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fonte do Investimento *</Label>
        <Select value={formSource} onValueChange={setFormSource}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a fonte" />
          </SelectTrigger>
          <SelectContent>
            {INVESTMENT_SOURCES.map(source => (
              <SelectItem key={source.value} value={source.value}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Nome/Descrição</Label>
        <Input
          placeholder="Ex: Campanha Black Friday"
          value={formSourceName}
          onChange={(e) => setFormSourceName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Valor (R$) *</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={formAmount}
          onChange={(e) => setFormAmount(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          placeholder="Notas adicionais..."
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button 
        onClick={isEdit ? handleEdit : handleAdd}
        disabled={!formSource || !formAmount || isSaving}
        className="w-full"
      >
        {isSaving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Adicionar Investimento"}
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Investimentos Manuais
            </CardTitle>
            <CardDescription>
              {format(referenceMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Investimento</DialogTitle>
                <DialogDescription>
                  Registre investimentos de outras plataformas ou fontes externas
                </DialogDescription>
              </DialogHeader>
              <InvestmentForm />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : investments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>Nenhum investimento manual registrado</p>
            <p className="text-sm">Clique em "Adicionar" para registrar investimentos externos</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => (
                  <TableRow key={investment.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {getSourceLabel(investment.source)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {investment.source_name || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(investment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(investment)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover investimento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(investment.id)}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="font-medium">Total Manual:</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(totalManualInvestment)}
              </span>
            </div>
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingInvestment} onOpenChange={(open) => {
          if (!open) {
            setEditingInvestment(null);
            resetForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Investimento</DialogTitle>
              <DialogDescription>
                Atualize os dados do investimento
              </DialogDescription>
            </DialogHeader>
            <InvestmentForm isEdit />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
