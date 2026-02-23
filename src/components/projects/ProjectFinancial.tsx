import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { ProjectPayment, useProjects } from "@/hooks/useProjects";
import { format, parseISO, isPast } from "date-fns";

interface ProjectFinancialProps {
  projectId: string;
  payments: ProjectPayment[];
}

export function ProjectFinancial({ projectId, payments }: ProjectFinancialProps) {
  const { createPayment, updatePayment, deletePayment } = useProjects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid = payments.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = totalAmount - totalPaid;

  const handleCreate = () => {
    if (!amount) return;
    createPayment.mutate({
      project_id: projectId,
      amount: parseFloat(amount),
      due_date: dueDate || null,
      description: description.trim() || null,
    });
    setDialogOpen(false);
    setAmount("");
    setDueDate("");
    setDescription("");
  };

  const markAsPaid = (payment: ProjectPayment) => {
    updatePayment.mutate({
      id: payment.id,
      paid_at: new Date().toISOString(),
      status: "paid",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">R$ {totalAmount.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">R$ {totalPaid.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Recebido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">R$ {totalPending.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Pendente</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Parcelas</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma parcela cadastrada</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.description || "—"}</TableCell>
                  <TableCell className="font-medium">R$ {Number(p.amount).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{p.due_date ? format(parseISO(p.due_date), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell>
                    {p.paid_at ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Pago</Badge>
                    ) : p.due_date && isPast(parseISO(p.due_date)) ? (
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Vencido</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!p.paid_at && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => markAsPaid(p)}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => deletePayment.mutate(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Parcela</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!amount}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
