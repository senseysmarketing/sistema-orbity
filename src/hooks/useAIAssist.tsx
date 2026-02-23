import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TaskPrefillResult {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  suggested_type?: string;
  suggested_date?: string;
  mentioned_clients?: string[];
  mentioned_users?: string[];
  platform?: string;
  post_type?: string;
  hashtags?: string[];
  creative_instructions?: string;
}

export interface PostPrefillResult {
  title: string;
  description: string;
  platform: string;
  post_type: string;
  hashtags: string[];
  creative_instructions?: string;
  priority?: "low" | "medium" | "high";
  suggested_date?: string;
  mentioned_clients?: string[];
  mentioned_users?: string[];
}

export interface ReportPrefillResult {
  message: string;
}

export interface CampaignAnalysisResult {
  analysis: string;
}

export interface AnalyticsReviewResult {
  summary: string;
  workload_analysis: string;
  bottlenecks: string;
  client_alerts: string;
  suggestions: string[];
  performance_score: number;
  performance_label: string;
}

export function useAIAssist() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const callAI = async (type: string, content: string, agencyId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { type, content, agency_id: agencyId },
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("429") || msg.includes("rate") || msg.includes("limite")) {
          toast({
            title: "Limite de requisições",
            description: "Tente novamente em alguns segundos.",
            variant: "destructive",
          });
        } else if (msg.includes("402") || msg.includes("créditos") || msg.includes("payment")) {
          toast({
            title: "Créditos esgotados",
            description: "Adicione créditos de IA ao workspace para continuar.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro na IA",
            description: "Não foi possível processar. Tente novamente.",
            variant: "destructive",
          });
        }
        return null;
      }

      if (data?.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        return null;
      }

      return data?.result || null;
    } catch (e) {
      console.error("AI assist error:", e);
      toast({
        title: "Erro",
        description: "Falha ao conectar com a IA.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const preFillTask = async (text: string, agencyId?: string): Promise<TaskPrefillResult | null> => {
    return callAI("prefill_task", text, agencyId);
  };

  const preFillPost = async (text: string, agencyId?: string): Promise<PostPrefillResult | null> => {
    return callAI("prefill_post", text, agencyId);
  };

  const generateReport = async (content: string, agencyId?: string): Promise<ReportPrefillResult | null> => {
    return callAI("report_traffic", content, agencyId);
  };

  const analyzeCampaign = async (content: string, agencyId?: string): Promise<CampaignAnalysisResult | null> => {
    return callAI("campaign_analysis", content, agencyId);
  };

  const analyzeTaskPeriod = async (content: string, agencyId?: string): Promise<AnalyticsReviewResult | null> => {
    return callAI("analytics_review", content, agencyId);
  };

  return { preFillTask, preFillPost, generateReport, analyzeCampaign, analyzeTaskPeriod, loading };
}
