import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from '@/hooks/useAgency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface BillingRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  billing_period_start: string;
  billing_period_end: string;
  paid_date?: string;
  due_date?: string;
  invoice_url?: string;
}

export function BillingHistory() {
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  useEffect(() => {
    if (currentAgency?.id) {
      fetchBillingHistory();
    }
  }, [currentAgency?.id]);

  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('agency_id', currentAgency?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBillingHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'overdue': return 'bg-red-500';
      case 'canceled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Vencido';
      case 'canceled': return 'Cancelado';
      default: return status;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Faturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Histórico de Faturas
        </CardTitle>
        <CardDescription>
          Visualize suas faturas recentes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {billingHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma fatura encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {billingHistory.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-white ${getStatusColor(bill.status)}`}>
                      {getStatusText(bill.status)}
                    </Badge>
                    <span className="font-semibold">
                      {formatCurrency(bill.amount, bill.currency)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Período: {formatDate(bill.billing_period_start)} - {formatDate(bill.billing_period_end)}
                  </p>
                  {bill.paid_date && (
                    <p className="text-xs text-green-600">
                      Pago em: {formatDate(bill.paid_date)}
                    </p>
                  )}
                  {bill.due_date && bill.status !== 'paid' && (
                    <p className="text-xs text-yellow-600">
                      Vencimento: {formatDate(bill.due_date)}
                    </p>
                  )}
                </div>
                {bill.invoice_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(bill.invoice_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
