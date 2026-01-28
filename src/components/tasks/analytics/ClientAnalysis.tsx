import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { ClientMetrics } from "./types";

interface ClientAnalysisProps {
  clientMetrics: ClientMetrics[];
  isCurrentMonth: boolean;
}

export function ClientAnalysis({ clientMetrics, isCurrentMonth }: ClientAnalysisProps) {
  // Sort by total tasks descending
  const sortedClients = [...clientMetrics]
    .filter(c => c.totalTasks > 0)
    .sort((a, b) => b.totalTasks - a.totalTasks);

  const clientsNeedingAttention = sortedClients.filter(c => c.needsAttention);

  const getStatusIcon = (client: ClientMetrics) => {
    if (client.needsAttention) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (client.completionRate >= 80) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (client.completionRate >= 50) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = (client: ClientMetrics) => {
    if (client.needsAttention) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600 text-xs">Atenção</Badge>;
    }
    if (client.completionRate >= 80) {
      return <Badge className="bg-green-500 text-xs">Bom</Badge>;
    }
    if (client.completionRate >= 50) {
      return <Badge variant="secondary" className="text-xs">Regular</Badge>;
    }
    return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
  };

  if (sortedClients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Análise por Cliente
          </CardTitle>
          <CardDescription>
            Ranking de clientes por volume de tarefas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarefa associada a clientes neste período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Análise por Cliente
        </CardTitle>
        <CardDescription>
          {isCurrentMonth 
            ? "Ranking e saúde das tarefas por cliente" 
            : "Performance das tarefas por cliente no período"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clients needing attention alert */}
        {clientsNeedingAttention.length > 0 && isCurrentMonth && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-600">
                {clientsNeedingAttention.length} cliente(s) precisam de atenção
              </p>
              <p className="text-xs text-muted-foreground">
                Clientes com taxa de conclusão abaixo de 50% ou muitas tarefas atrasadas
              </p>
            </div>
          </div>
        )}

        {/* Client list */}
        <div className="space-y-3">
          {sortedClients.slice(0, 8).map((client) => (
            <div key={client.clientId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(client)}
                  <span className="font-medium text-sm truncate">{client.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {client.totalTasks} tarefas
                  </Badge>
                  {getStatusBadge(client)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={client.completionRate} 
                  className="flex-1 h-2"
                />
                <span className={`text-xs w-10 text-right ${
                  client.completionRate >= 80 
                    ? "text-green-600" 
                    : client.completionRate < 50 
                      ? "text-red-600" 
                      : "text-muted-foreground"
                }`}>
                  {client.completionRate}%
                </span>
              </div>
              {client.overdueTasks > 0 && (
                <p className="text-xs text-destructive">
                  {client.overdueTasks} tarefa(s) atrasada(s)
                </p>
              )}
            </div>
          ))}
        </div>

        {sortedClients.length > 8 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{sortedClients.length - 8} clientes não exibidos
          </p>
        )}
      </CardContent>
    </Card>
  );
}
