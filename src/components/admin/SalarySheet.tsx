import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { Ban, HelpCircle, Save, X } from "lucide-react";
import type { Employee } from "@/hooks/useFinancialMetrics";

interface SalarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  salary?: any;
  employees?: Employee[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" | "secondary" }> = {
  pending: { label: "Pendente", variant: "warning" },
  overdue: { label: "Atrasado", variant: "danger" },
  paid: { label: "Pago", variant: "success" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

export function SalarySheet({ open, onOpenChange, onSuccess, salary, employees = [] }: SalarySheetProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [updateBaseSalary, setUpdateBaseSalary] = useState(false);
  const [deactivateEmployee, setDeactivateEmployee] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [baseSalary, setBaseSalary] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [description, setDescription] = useState("");

  const isEditing = !!salary;

  const netSalary = useMemo(() => {
    return Math.max(0, baseSalary + bonus - discounts);
  }, [baseSalary, bonus, discounts]);

  // Initialize form
  useEffect(() => {
    if (!open) return;
    setUpdateBaseSalary(false);
    setDeactivateEmployee(false);

    if (salary) {
      const empId = salary.employee_id || "";
      setEmployeeId(empId);
      const emp = employees.find(e => e.id === empId);
      const base = emp?.base_salary || salary.amount || 0;
      setBaseSalary(base);

      const diff = (salary.amount || 0) - base;
      if (diff > 0) {
        setBonus(diff);
        setDiscounts(0);
      } else if (diff < 0) {
        setBonus(0);
        setDiscounts(Math.abs(diff));
      } else {
        setBonus(0);
        setDiscounts(0);
      }

      setDueDate(salary.due_date ? salary.due_date.split("T")[0] : "");
      setPaidDate(salary.paid_date ? salary.paid_date.split("T")[0] : "");
      setStatus(salary.status || "pending");
      setDescription(salary.description || "");
    } else {
      setEmployeeId("");
      setBaseSalary(0);
      setBonus(0);
      setDiscounts(0);
      setDueDate("");
      setPaidDate("");
      setStatus("pending");
      setDescription("");
    }
  }, [open, salary, employees]);

  // Update base salary when employee changes (new mode)
  useEffect(() => {
    if (isEditing) return;
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setBaseSalary(emp.base_salary);
    } else {
      setBaseSalary(0);
    }
  }, [employeeId, employees, isEditing]);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const statusInfo = statusConfig[status] || statusConfig.pending;

  const handleSubmit = async () => {
    if (!employeeId || !dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const emp = employees.find(e => e.id === employeeId);
      const data: any = {
        employee_id: employeeId,
        employee_name: emp?.name || salary?.employee_name || "",
        amount: netSalary,
        due_date: dueDate,
        paid_date: status === "paid" ? (paidDate || new Date().toISOString().split("T")[0]) : null,
        status,
        description: description || null,
        agency_id: currentAgency?.id,
      };

      if (salary?.id) {
        const { error } = await supabase.from("salaries").update(data).eq("id", salary.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("salaries").insert([data]);
        if (error) throw error;
      }

      // Update base salary on employee if switch is on
      if (updateBaseSalary && netSalary !== baseSalary && employeeId) {
        const { error } = await supabase.from("employees").update({ base_salary: netSalary }).eq("id", employeeId);
        if (error) throw error;
        toast({ title: "Salário base atualizado", description: `O salário base de ${emp?.name} foi atualizado para os próximos meses.` });
      }

      toast({ title: salary ? "Salário atualizado" : "Salário criado", description: "Operação realizada com sucesso!" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!salary?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("salaries").update({ status: "cancelled" }).eq("id", salary.id);
      if (error) throw error;

      if (deactivateEmployee && employeeId) {
        const { error: empError } = await supabase.from("employees").update({ is_active: false, end_date: new Date().toISOString().split("T")[0] }).eq("id", employeeId);
        if (empError) throw empError;
        toast({ title: "Funcionário desligado", description: "O colaborador foi inativado e não terá salários gerados nos próximos meses." });
      }

      toast({ title: "Pagamento cancelado", description: "Este salário foi cancelado." });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
      setDeactivateEmployee(false);
    }
  };

  const activeEmployees = employees.filter(e => e.is_active || e.id === employeeId);

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <SheetTitle>{isEditing ? "Holerite do Mês" : "Novo Salário"}</SheetTitle>
              {isEditing && (
                <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>
              )}
            </div>
            <SheetDescription>
              {isEditing
                ? `${selectedEmployee?.name || salary?.employee_name} · ${selectedEmployee?.role || "Sem cargo"}`
                : "Registre um novo salário para um funcionário"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* Employee Select */}
            <div className="space-y-2">
              <Label>Funcionário *</Label>
              {employees.length === 0 ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={employeeId} onValueChange={setEmployeeId} disabled={isEditing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} {emp.role ? `(${emp.role})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Base Salary (read-only) */}
            <div className="space-y-2">
              <Label>Salário Base (Contrato)</Label>
              <Input
                type="number"
                value={baseSalary}
                disabled
                className="bg-muted font-semibold"
              />
            </div>

            {/* Bonus */}
            <div className="space-y-2">
              <Label>Bônus / Comissões</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={bonus || ""}
                onChange={e => setBonus(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            {/* Discounts */}
            <div className="space-y-2">
              <Label>Descontos / Faltas</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discounts || ""}
                onChange={e => setDiscounts(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>

            {/* Net Salary */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Salário Líquido</p>
              <p className="text-2xl font-bold text-foreground">
                {netSalary.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>

            {/* Update Base Salary Switch */}
            {netSalary !== baseSalary && baseSalary > 0 && (
              <div className="flex items-start gap-3 rounded-lg border p-3 bg-card">
                <Switch
                  checked={updateBaseSalary}
                  onCheckedChange={setUpdateBaseSalary}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">Atualizar Salário Base</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Ao ativar, o salário base do funcionário será atualizado permanentemente. Os holerites dos próximos meses serão gerados com este novo valor.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">Aplica este novo valor para os próximos meses</p>
                </div>
              </div>
            )}

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Data de Vencimento *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Paid Date */}
            {status === "paid" && (
              <div className="space-y-2">
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={e => setPaidDate(e.target.value)}
                />
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label>Observações da Folha</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Justifique bônus, descontos ou observações..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              {isEditing && status !== "cancelled" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setCancelDialogOpen(true)}
                  className="mr-auto"
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Cancelar Pagamento
                </Button>
              )}
              <div className={`flex gap-2 ${!isEditing || status === "cancelled" ? "ml-auto" : ""}`}>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Fechar
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Payment AlertDialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => { setCancelDialogOpen(open); if (!open) setDeactivateEmployee(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente cancelar este pagamento? O salário será marcado como cancelado, mas o histórico será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              checked={deactivateEmployee}
              onCheckedChange={(checked) => setDeactivateEmployee(checked === true)}
              id="deactivate-employee"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="deactivate-employee" className="text-sm font-medium cursor-pointer">
                  Desligar funcionário
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    O colaborador será marcado como inativo e novos salários não serão gerados nos próximos meses.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">Inativa o colaborador e cessa a geração de salários futuros</p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateEmployee ? "Cancelar e Desligar" : "Cancelar Pagamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
