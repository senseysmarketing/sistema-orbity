import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, Calendar, UserPlus, FileText, MessageSquare, 
  DollarSign, Target, Briefcase 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Nova Reunião",
      description: "Agendar compromisso",
      onClick: () => navigate("/dashboard/agenda"),
      variant: "default" as const,
    },
    {
      icon: <UserPlus className="h-5 w-5" />,
      label: "Novo Lead",
      description: "Adicionar ao CRM",
      onClick: () => navigate("/dashboard/crm"),
      variant: "default" as const,
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Criar Post",
      description: "Social Media",
      onClick: () => navigate("/dashboard/social-media"),
      variant: "default" as const,
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: "Novo Contrato",
      description: "Gerar documento",
      onClick: () => navigate("/dashboard/contracts"),
      variant: "default" as const,
    },
    {
      icon: <Target className="h-5 w-5" />,
      label: "Nova Campanha",
      description: "Tráfego pago",
      onClick: () => navigate("/dashboard/traffic"),
      variant: "default" as const,
    },
    {
      icon: <Briefcase className="h-5 w-5" />,
      label: "Novo Cliente",
      description: "Adicionar à base",
      onClick: () => navigate("/dashboard/admin"),
      variant: "default" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-accent"
              onClick={action.onClick}
            >
              <div className="text-primary">{action.icon}</div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}