import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";

interface CreatePaymentData {
  client_id: string;
  amount: number;
  due_date: string;
  description?: string | null;
  billing_type?: string;
  status?: "pending" | "paid" | "overdue";
  paid_date?: string | null;
  auto_invoice?: boolean;
}

interface UpdatePaymentData extends CreatePaymentData {
  id: string;
}

export function useCreatePayment() {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);

  const createPayment = async (data: CreatePaymentData) => {
    if (!currentAgency?.id) {
      toast({ title: "Erro", description: "Agência não encontrada", variant: "destructive" });
      return null;
    }

    setLoading(true);
    try {
      // Roteamento por billing_type escolhido no formulário
      if (data.billing_type === "stripe") {
        const { data: result, error } = await supabase.functions.invoke(
          "create-agency-stripe-charge",
          {
            body: {
              client_id: data.client_id,
              amount: data.amount,
              due_date: data.due_date,
              description: data.description ?? null,
              agency_id: currentAgency.id,
              currency: "brl",
            },
          },
        );
        if (error) throw new Error(error.message);
        if (result?.error) throw new Error(result.error);

        toast({
          title: "Cobrança Stripe criada",
          description: "Link de pagamento gerado com sucesso!",
        });
        return result.payment;
      }

      const payload: Record<string, unknown> = {
        client_id: data.client_id,
        amount: data.amount,
        due_date: data.due_date,
        description: data.description || null,
        billing_type: data.billing_type || "manual",
        status: data.status || "pending",
        paid_date: data.paid_date || null,
        agency_id: currentAgency.id,
      };

      if (data.auto_invoice !== undefined) {
        payload.auto_invoice = data.auto_invoice;
      }

      const { data: result, error } = await supabase.functions.invoke(
        "create-gateway-charge",
        { body: payload }
      );

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);

      toast({ title: "Fatura criada", description: "Cobrança gerada com sucesso!" });
      return result.payment;
    } catch (error: any) {
      toast({ title: "Erro ao criar fatura", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePayment = async (data: UpdatePaymentData) => {
    setLoading(true);
    try {
      const { id, ...payload } = data;
      const { error } = await supabase
        .from("client_payments")
        .update({ ...payload, agency_id: currentAgency?.id })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Fatura atualizada", description: "Salvo com sucesso!" });
      return true;
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createPayment, updatePayment, loading };
}
