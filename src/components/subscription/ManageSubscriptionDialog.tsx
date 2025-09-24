import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, Building } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageSubscriptionDialog({ open, onOpenChange }: ManageSubscriptionDialogProps) {
  const { plans, currentSubscription, createCheckout } = useSubscription();
  const [loading, setLoading] = useState(false);

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'free': return <Zap className="h-5 w-5" />;
      case 'basic': return <Building className="h-5 w-5" />;
      case 'professional': return <Crown className="h-5 w-5" />;
      case 'enterprise': return <Crown className="h-5 w-5" />;
      case 'senseys': return <Crown className="h-5 w-5 text-purple-500" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isCurrentPlan = (planName: string) => {
    return currentSubscription?.plan_name === planName;
  };

  const handlePlanSelect = async (plan: any) => {
    if (isCurrentPlan(plan.name)) return;
    
    setLoading(true);
    try {
      if (plan.stripe_price_id_monthly) {
        await createCheckout(plan.stripe_price_id_monthly);
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const availablePlans = plans.filter(plan => 
    !isCurrentPlan(plan.name) && plan.slug !== 'senseys'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinatura</DialogTitle>
          <DialogDescription>
            Altere seu plano ou gerencie sua assinatura atual
          </DialogDescription>
        </DialogHeader>

        {/* Current Plan */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getPlanIcon(currentSubscription?.plan_name?.toLowerCase() || '')}
                <div>
                  <CardTitle className="text-lg">
                    {currentSubscription?.plan_name || 'Plano Atual'}
                  </CardTitle>
                  <CardDescription>Seu plano atual</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-500 text-white">
                Ativo
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {currentSubscription?.plan_name === 'Senseys' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Recursos ilimitados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Suporte prioritário</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Plano especial corporativo</span>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Este é um plano especial com recursos ilimitados. Para alterações, entre em contato com o suporte.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Para gerenciar detalhes de pagamento, acesse o portal do cliente do Stripe.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Available Plans for Upgrade */}
        {availablePlans.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Planos Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlans.map((plan) => (
                <Card 
                  key={plan.id}
                  className="transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2 text-primary">
                      {getPlanIcon(plan.slug)}
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-sm min-h-[40px]">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-2xl font-bold">
                        {formatPrice(plan.price_monthly)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {plan.max_users >= 999999 ? 'Usuários ilimitados' : `${plan.max_users} usuários`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {plan.max_clients >= 999999 ? 'Clientes ilimitados' : `${plan.max_clients} clientes`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {plan.max_tasks >= 999999 ? 'Tarefas ilimitadas' : `${plan.max_tasks} tarefas`}
                      </span>
                    </div>

                    {plan.has_crm && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Sistema CRM</span>
                      </div>
                    )}

                    {plan.has_advanced_reports && (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Relatórios Avançados</span>
                      </div>
                    )}

                    <Button
                      className="w-full mt-4"
                      onClick={() => handlePlanSelect(plan)}
                      disabled={loading}
                    >
                      Fazer Upgrade
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Support Contact */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-2">Precisa de ajuda?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Para cancelamentos ou dúvidas sobre sua assinatura, entre em contato com nosso suporte.
            </p>
            <Button variant="outline" size="sm">
              Contatar Suporte
            </Button>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}