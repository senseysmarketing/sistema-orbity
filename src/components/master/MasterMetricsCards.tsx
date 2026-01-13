import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaster } from '@/hooks/useMaster';
import { Building2, Users, UserCheck, TrendingUp, CreditCard } from 'lucide-react';

export function MasterMetricsCards() {
  const { getMasterMetrics, loading } = useMaster();
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = getMasterMetrics();

  const cards = [
    {
      title: "Total de Agências",
      value: metrics.totalAgencies,
      icon: Building2,
      description: "Agências cadastradas"
    },
    {
      title: "Agências Ativas",
      value: metrics.activeAgencies,
      icon: UserCheck,
      description: "Com assinaturas ativas"
    },
    {
      title: "MRR",
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(metrics.mrr),
      icon: TrendingUp,
      description: "Receita recorrente mensal"
    },
    {
      title: "Total de Usuários",
      value: metrics.totalUsers,
      icon: Users,
      description: "Usuários ativos"
    },
    {
      title: "Pagamentos Recebidos",
      value: metrics.totalPayments,
      icon: CreditCard,
      description: "Cobranças pagas"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}