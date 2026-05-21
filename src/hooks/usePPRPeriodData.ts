import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PPRPeriodMonth {
  id: string;
  period_id: string;
  month_start: string;
  month_end: string;
  revenue: number;
  expenses: number;
  salaries: number;
  adjustments: number;
  net_profit: number;
  bonus_pool: number;
  source_snapshot: Record<string, any> | null;
  calculated_at: string;
}

export interface PPREmployeeResult {
  id: string;
  period_id: string;
  employee_id: string;
  eligibility_weight: number;
  base_share: number;
  score_final: number;
  bonus_amount: number;
  calculation_details: Record<string, any> | null;
  calculated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string | null;
  is_active: boolean;
  eligible_for_ppr: boolean;
  eligibility_weight: number;
  user_id?: string | null;
}

export interface Scorecard {
  id: string;
  period_id: string;
  employee_id: string;
  user_id: string | null;
  nps_retention_score: number;
  technical_delivery_score: number;
  process_innovation_score: number;
  weighted_average: number;
  status: string;
  notes: string | null;
  criteria_snapshot: Record<string, any> | null;
  locked_at: string | null;
  submitted_at: string | null;
}

export function usePPRPeriodData(periodId: string | null | undefined, agencyId: string | null | undefined) {
  const months = useQuery({
    queryKey: ["ppr-period-months", periodId],
    queryFn: async (): Promise<PPRPeriodMonth[]> => {
      const { data, error } = await supabase
        .from("ppr_period_months")
        .select("*")
        .eq("period_id", periodId!)
        .order("month_start");
      if (error) throw error;
      return (data || []) as unknown as PPRPeriodMonth[];
    },
    enabled: !!periodId,
  });

  const employeeResults = useQuery({
    queryKey: ["ppr-employee-results", periodId],
    queryFn: async (): Promise<PPREmployeeResult[]> => {
      const { data, error } = await supabase
        .from("ppr_employee_results")
        .select("*")
        .eq("period_id", periodId!);
      if (error) throw error;
      return (data || []) as unknown as PPREmployeeResult[];
    },
    enabled: !!periodId,
  });

  const employees = useQuery({
    queryKey: ["ppr-employees", agencyId],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, role, is_active, eligible_for_ppr, eligibility_weight")
        .eq("agency_id", agencyId!)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Employee[];
    },
    enabled: !!agencyId,
  });

  const scorecards = useQuery({
    queryKey: ["ppr-scorecards", periodId],
    queryFn: async (): Promise<Scorecard[]> => {
      const { data, error } = await supabase
        .from("employee_scorecards")
        .select("*")
        .eq("period_id", periodId!);
      if (error) throw error;
      return (data || []) as unknown as Scorecard[];
    },
    enabled: !!periodId,
  });

  return { months, employeeResults, employees, scorecards };
}
