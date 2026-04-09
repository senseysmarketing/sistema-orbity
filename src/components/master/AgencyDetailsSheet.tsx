import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMaster } from '@/hooks/useMaster';
import { useState } from 'react';

interface AgencyDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: {
    agency_id: string;
    agency_name: string;
    created_at: string;
    is_active: boolean;
    user_count: number;
    client_count: number;
    task_count: number;
    total_revenue: number;
    plan_name: string;
    subscription_status: string;
    current_period_end: string;
    trial_end: string | null;
    computed_status: string;
    price_monthly: number | null;
  } | null;
}

// Mock payment history data
const MOCK_PAYMENTS = [
  { id: '1', date: '2025-06-01', amount: 997, status: 'paid' },
  { id: '2', date: '2025-05-01', amount: 997, status: 'paid' },
  { id: '3', date: '2025-04-01', amount: 997, status: 'paid' },
  { id: '4', date: '2025-03-01', amount: 997, status: 'paid' },
];

export function AgencyDetailsSheet({ open, onOpenChange, agency }: AgencyDetailsSheetProps) {
  const { suspendAgency, reactivateAgency } = useMaster();
  const [toggling, setToggling] = useState(false);

  if (!agency) return null;

  const handleToggleActive = async (checked: boolean) => {
    setToggling(true);
    if (checked) {
      await reactivateAgency(agency.agency_id);
    } else {
      await suspendAgency(agency.agency_id);
    }
    setToggling(false);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {agency.agency_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-muted/50">
              <Users className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">{agency.user_count}</div>
              <div className="text-xs text-muted-foreground">Usuários</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <Building2 className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-lg font-bold">{agency.client_count}</div>
              <div className="text-xs text-muted-foreground">Clientes</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-sm font-medium">{format(new Date(agency.created_at), 'dd/MM/yyyy', { locale: ptBR })}</div>
              <div className="text-xs text-muted-foreground">Criada em</div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/50">
              <DollarSign className="h-4 w-4 text-muted-foreground mb-1" />
              <div className="text-sm font-medium">{formatCurrency(Number(agency.price_monthly || 0))}</div>
              <div className="text-xs text-muted-foreground">Valor Mensal</div>
            </div>
          </div>

          <Separator />

          {/* Suspend Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Acesso Ativo</Label>
              <p className="text-xs text-muted-foreground">Suspender ou reativar acesso manualmente</p>
            </div>
            <Switch
              checked={agency.is_active}
              onCheckedChange={handleToggleActive}
              disabled={toggling}
            />
          </div>

          <Separator />

          {/* Payment History (Mock) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {MOCK_PAYMENTS.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{format(new Date(p.date), 'MMM yyyy', { locale: ptBR })}</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Pago</Badge>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Dados mockados — integração com Stripe pendente
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
