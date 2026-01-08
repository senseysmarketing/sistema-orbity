import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoLeads, getLeadsByStatus, getStatusLabel, getStatusColor, getPriorityColor } from "@/data/demoData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DollarSign, Phone, Building2 } from "lucide-react";

export function DemoCRMView() {
  const leadsByStatus = getLeadsByStatus().filter(s => s.status !== "perdido");

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">CRM - Pipeline de Vendas</h2>
          <p className="text-sm text-muted-foreground">{demoLeads.length} leads no funil</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="bg-[#1c102f] hover:bg-[#1c102f]/90 cursor-not-allowed opacity-70" size="sm">
                + Novo Lead
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Crie sua conta grátis para adicionar leads</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {leadsByStatus.map((column) => (
          <Card key={column.status} className="min-w-[220px] flex-shrink-0">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(column.status)}`} />
                  {getStatusLabel(column.status)}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">{column.count}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {column.leads.map((lead) => (
                <TooltipProvider key={lead.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2.5 bg-muted/50 rounded-lg cursor-not-allowed hover:bg-muted transition-colors border border-transparent hover:border-[#1c102f]/20">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#1c102f] to-purple-600 flex items-center justify-center text-white font-semibold text-[10px]">
                                {lead.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="text-xs font-medium">{lead.name}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-2.5 w-2.5" />
                                  {lead.company}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPriorityColor(lead.priority)}`}>
                              {lead.priority}
                            </Badge>
                            <span className="text-[10px] font-medium text-green-600 flex items-center">
                              <DollarSign className="h-3 w-3" />
                              {lead.value.toLocaleString()}
                            </span>
                          </div>

                          <div className="text-[10px] text-muted-foreground">
                            Origem: {lead.source}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Crie sua conta para gerenciar este lead</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              R$ {demoLeads.reduce((acc, l) => acc + l.value, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Valor Total no Pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-[#1c102f]">
              {demoLeads.filter(l => l.status === "cliente").length}
            </p>
            <p className="text-xs text-muted-foreground">Convertidos Este Mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">
              16.7%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
