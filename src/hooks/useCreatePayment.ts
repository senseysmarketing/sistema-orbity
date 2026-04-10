import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";

interface FinancialRules {
  fine_percentage?: number;
  interest_percentage?: number;
  discount_percentage?: number;
  discount_days_before?: number;
}

interface CreatePaymentData {
  client_id: string;
  amount: number;
  due_date: string;
  description?: string | null;
  billing_type?: string;
  status?: "pending" | "paid" | "overdue";
  paid_date?: string | null;
  financial_rules?: FinancialRules;
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
      // TODO [Edge Function]: When the create-charge Edge Function for Asaas/Conexa is implemented,
      // it should:
      //   1. Read agency_payment_settings for the agency
      //   2. Build the `fine`, `interest`, and `discount` objects per gateway docs:
      //      Asaas: { fine: { value: fine_percentage }, interest: { value: interest_percentage },
      //              discount: { value: discount_percentage, dueDateLimitDays: discount_days_before, type: "PERCENTAGE" } }
      //      Conexa: map to equivalent fields per Conexa API docs
      //   3. Inject into the JSON payload sent to the gateway API
      const payload = {
        client_id: data.client_id,
        amount: data.amount,
        due_date: data.due_date,
        description: data.description || null,
        billing_type: data.billing_type || "manual",
        status: data.status || ("pending" as const),
        paid_date: data.paid_date || null,
        agency_id: currentAgency.id,
      };

      const { data: result, error } = await supabase
        .from("client_payments")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Fatura criada", description: "Cobrança gerada com sucesso!" });
      return result;
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
