import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CampaignsManager() {
  const { campaigns, loading } = useCampaigns();

  const statusColors = {
    planning: "bg-yellow-500",
    active: "bg-green-500",
    completed: "bg-blue-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Campanhas</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {loading ? (
        <p>Carregando campanhas...</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhuma campanha criada ainda. Crie sua primeira campanha para agrupar postagens relacionadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge className={`${statusColors[campaign.status as keyof typeof statusColors]} text-white`}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {campaign.clients && (
                  <p className="text-sm font-medium">{campaign.clients.name}</p>
                )}
                {campaign.goal && (
                  <p className="text-sm text-muted-foreground">{campaign.goal}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>Início: {format(new Date(campaign.start_date), "dd MMM yyyy", { locale: ptBR })}</p>
                  <p>Término: {format(new Date(campaign.end_date), "dd MMM yyyy", { locale: ptBR })}</p>
                </div>
                {campaign.budget && (
                  <p className="text-sm font-semibold">
                    Orçamento: R$ {campaign.budget.toLocaleString('pt-BR')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
