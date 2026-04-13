import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface ManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageSubscriptionDialog({ open, onOpenChange }: ManageSubscriptionDialogProps) {
  const { plans, createCheckout } = useSubscription();
  const [loading, setLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const orbityPlans = plans.filter(plan => 
    ['orbity_monthly', 'orbity_annual'].includes(plan.slug)
  );

  const handlePlanSelect = async (plan: typeof orbityPlans[0]) => {
    setLoading(true);
    try {
      const priceId = plan.slug === 'orbity_annual' 
        ? plan.stripe_price_id_yearly 
        : plan.stripe_price_id_monthly;
      
      if (priceId) {
        await createCheckout(priceId);
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Escolha seu Plano Orbity</DialogTitle>
          <DialogDescription>
            Selecione o plano ideal para sua agência e comece agora
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {orbityPlans.map((plan) => {
            const isAnnual = plan.slug === 'orbity_annual';
            

            return (
              <Card 
                key={plan.id}
                className={`transition-all duration-200 hover:shadow-md relative ${isAnnual ? 'border-2 border-primary' : ''}`}
              >
                {isAnnual && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Melhor custo-benefício
                  </Badge>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2 text-primary">
                    {isAnnual ? <Crown className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
                  </div>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    {isAnnual ? (
                      <>
                        <span className="text-3xl font-bold">{formatPrice(plan.price_monthly)}</span>
                        <span className="text-muted-foreground">/mês</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cobrado anualmente {formatPrice(plan.price_yearly || plan.price_monthly * 12)}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">{formatPrice(plan.price_monthly)}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">
                      {plan.max_users >= 999999 ? 'Usuários ilimitados' : `${plan.max_users} usuários`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">
                      {plan.max_clients >= 999999 ? 'Clientes ilimitados' : `${plan.max_clients} clientes`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">
                      {plan.max_tasks >= 999999 ? 'Tarefas ilimitadas' : `${plan.max_tasks} tarefas`}
                    </span>
                  </div>
                  {plan.has_crm && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-sm">Sistema CRM</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="text-sm">Planner Social Media</span>
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant={isAnnual ? 'default' : 'outline'}
                    onClick={() => handlePlanSelect(plan)}
                    disabled={loading}
                  >
                    {isAnnual ? 'Assinar Plano Anual' : 'Assinar Plano Mensal'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-muted/50 mt-2">
          <CardContent className="pt-6">
            <h4 className="font-medium mb-2">Precisa de ajuda?</h4>
            <p className="text-sm text-muted-foreground">
              Para dúvidas sobre planos ou pagamento, entre em contato com nosso suporte.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
