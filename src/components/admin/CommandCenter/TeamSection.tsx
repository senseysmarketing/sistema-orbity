import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Users, Plus, Settings, UserCheck, UserX } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Employee } from "@/hooks/useFinancialMetrics";

interface TeamSectionProps {
  employees: Employee[];
  onEditEmployee: (employee: Employee) => void;
  onEditSalaryByEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onToggleEmployeeActive: (employee: Employee) => void;
  onAddEmployee: () => void;
}

export function TeamSection({
  employees,
  onEditEmployee,
  onEditSalaryByEmployee,
  onDeleteEmployee: _onDeleteEmployee,
  onToggleEmployeeActive,
  onAddEmployee,
}: TeamSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeEmployees = employees.filter(e => e.is_active);
  const totalPayroll = activeEmployees.reduce((sum, e) => sum + e.base_salary, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Equipe ({activeEmployees.length} ativos)
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSheetOpen(true)}>
              <Settings className="h-3.5 w-3.5 mr-1" />
              Gerenciar Equipe
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum funcionário cadastrado</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {activeEmployees.slice(0, 8).map(emp => (
              <div key={emp.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onEditEmployee(emp)}>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">{emp.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.role || 'Sem cargo'}</p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  {formatCurrency(emp.base_salary)}
                </span>
              </div>
            ))}
            {activeEmployees.length > 8 && (
              <div className="flex items-center justify-center p-3 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50" onClick={() => setSheetOpen(true)}>
                <span className="text-sm text-muted-foreground">+{activeEmployees.length - 8} mais</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Sheet de Gestão Completa da Equipe */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Gerenciar Equipe</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Folha Total</p>
                <p className="text-lg font-bold">{formatCurrency(totalPayroll)}</p>
              </div>
              <Badge>{activeEmployees.length} ativos</Badge>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => { onAddEmployee(); setSheetOpen(false); }}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Novo Funcionário
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${emp.is_active ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-muted'}`}>
                      {emp.is_active ? <UserCheck className="h-4 w-4 text-emerald-600" /> : <UserX className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role || 'Sem cargo'} · {formatCurrency(emp.base_salary)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { onEditEmployee(emp); setSheetOpen(false); }}>
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onToggleEmployeeActive(emp)}>
                      {emp.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
