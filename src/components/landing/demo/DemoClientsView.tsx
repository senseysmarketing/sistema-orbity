import { Building2, Phone, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoClients } from "@/data/demoData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function DemoClientsView() {
  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clientes</h2>
          <p className="text-sm text-muted-foreground">{demoClients.filter(c => c.active).length} clientes ativos</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="bg-[#1c102f] hover:bg-[#1c102f]/90 cursor-not-allowed opacity-70" size="sm">
                + Novo Cliente
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Solicite acesso para adicionar clientes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {demoClients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1c102f] to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">{client.service}</p>
                  </div>
                </div>
                <Badge variant={client.active ? "default" : "secondary"} className={client.active ? "bg-green-500" : ""}>
                  {client.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>R$ {client.monthly_value.toLocaleString()}/mês</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{client.contact}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Desde {new Date(client.start_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs cursor-not-allowed opacity-70">
                        Ver Detalhes
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Solicite acesso para ver detalhes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs cursor-not-allowed opacity-70">
                        Tarefas
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Solicite acesso para gerenciar tarefas</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
