import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, UserCheck, UserX, DollarSign, Calendar } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  base_salary: number;
  role?: string;
  payment_day: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface EmployeeCardProps {
  employee: Employee;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onToggleActive: (employee: Employee) => void;
}

export function EmployeeCard({ employee, onView, onEdit, onDelete, onToggleActive }: EmployeeCardProps) {
  return (
    <Card 
      className={`relative transition-all hover:shadow-md cursor-pointer ${
        employee.is_active 
          ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
          : 'bg-gray-50/50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 opacity-70'
      }`}
      onClick={() => onView(employee)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${employee.is_active ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {employee.is_active ? (
              <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <UserX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-base">{employee.name}</h3>
            {employee.role && (
              <p className="text-xs text-muted-foreground">{employee.role}</p>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(employee); }}>
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(employee); }}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(employee); }}>
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
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(employee); }}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="space-y-3">
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
            <span>Dia Pgto</span>
          </div>
          <Badge variant="outline">Dia {employee.payment_day}</Badge>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <Badge variant={employee.is_active ? "default" : "secondary"}>
            {employee.is_active ? "Ativo" : "Inativo"}
          </Badge>
          {employee.start_date && (
            <span className="text-xs text-muted-foreground">
              Desde {new Date(employee.start_date).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
