import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, UserCheck, UserX, DollarSign, Calendar, Briefcase } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  base_salary: number;
  role?: string;
  payment_day: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

interface EmployeeDetailsDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onToggleActive: (employee: Employee) => void;
}

export function EmployeeDetailsDialog({ 
  employee, 
  open, 
  onOpenChange, 
  onEdit, 
  onDelete,
  onToggleActive 
}: EmployeeDetailsDialogProps) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${employee.is_active ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {employee.is_active ? (
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <UserX className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            {employee.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          
          <Separator />
          
          {/* Informações */}
          <div className="space-y-3">
            {employee.role && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>Cargo</span>
                </div>
                <span className="font-medium">{employee.role}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>Salário Base</span>
              </div>
              <span className="font-bold text-lg">
                R$ {employee.base_salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Dia de Pagamento</span>
              </div>
              <Badge variant="outline">Dia {employee.payment_day}</Badge>
            </div>
            
            {employee.start_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data de Início</span>
                <span>{new Date(employee.start_date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            
            {employee.end_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data de Saída</span>
                <span>{new Date(employee.end_date).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => { onEdit(employee); onOpenChange(false); }}
              className="flex-1"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => onToggleActive(employee)}
              className="flex-1"
            >
              {employee.is_active ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Desativar
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Ativar
                </>
              )}
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={() => { onDelete(employee); onOpenChange(false); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
