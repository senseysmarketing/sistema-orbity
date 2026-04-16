import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquareHeart, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

// Use anon client for public access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

type TokenData = {
  id: string;
  agency_id: string;
  client_id: string;
  period: string;
  client_name: string;
  agency_name: string;
};

function getCategory(score: number): string {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

function getFeedbackConfig(score: number | null) {
  if (score === null) return null;
  if (score >= 9) return {
    placeholder: "Ficamos muito felizes! O que mais gostou?",
    className: "border-emerald-300 bg-emerald-50 focus:border-emerald-500",
  };
  if (score >= 7) return {
    placeholder: "Obrigado! O que faltou para a nota ser 10?",
    className: "border-amber-300 bg-amber-50 focus:border-amber-500",
  };
  return {
    placeholder: "Sentimos muito por isso. O que podemos fazer IMEDIATAMENTE para resolver o seu problema?",
    className: "border-red-400 bg-red-50 focus:border-red-500",
  };
}

function getScoreColor(score: number): string {
  if (score >= 9) return "bg-emerald-500 hover:bg-emerald-600 text-white";
  if (score >= 7) return "bg-amber-400 hover:bg-amber-500 text-white";
  return "bg-red-500 hover:bg-red-600 text-white";
}

export default function PublicNPSSurvey() {
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get("t");

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!tokenId) {
      setError("Link inválido. Verifique o link recebido.");
      setLoading(false);
      return;
    }

    async function validateToken() {
      try {
        const { data: token, error: tokenError } = await anonClient
          .from("nps_tokens")
          .select("id, agency_id, client_id, period, is_used, expires_at")
          .eq("id", tokenId!)
          .single();

        if (tokenError || !token) {
          setError("Link não encontrado ou expirado.");
          setLoading(false);
          return;
        }

        if (token.is_used) {
          setError("Esta pesquisa já foi respondida. Obrigado!");
          setLoading(false);
          return;
        }

        if (new Date(token.expires_at) < new Date()) {
          setError("Este link expirou. Solicite um novo à sua agência.");
          setLoading(false);
          return;
        }

        // Fetch client and agency names
        const [clientRes, agencyRes] = await Promise.all([
          anonClient.from("clients").select("name").eq("id", token.client_id).single(),
          anonClient.from("agencies").select("name").eq("id", token.agency_id).single(),
        ]);

        setTokenData({
          id: token.id,
          agency_id: token.agency_id,
          client_id: token.client_id,
          period: token.period,
          client_name: clientRes.data?.name || "Cliente",
          agency_name: agencyRes.data?.name || "Agência",
        });
      } catch {
        setError("Erro ao validar o link.");
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [tokenId]);

  const handleSubmit = async () => {
    if (selectedScore === null || !tokenData) return;
    setSubmitting(true);

    try {
      // 1. Insert NPS response
      const { error: insertError } = await anonClient
        .from("nps_responses")
        .insert({
          agency_id: tokenData.agency_id,
          client_id: tokenData.client_id,
          client_name: tokenData.client_name,
          score: selectedScore,
          category: getCategory(selectedScore),
          comment: comment || null,
          period: tokenData.period,
          response_date: new Date().toISOString().split("T")[0],
        });

      if (insertError) throw insertError;

      // 2. Mark token as used
      await anonClient
        .from("nps_tokens")
        .update({ is_used: true })
        .eq("id", tokenData.id);

      // 3. If detractor, insert churn alert notification for agency admins
      if (selectedScore <= 6) {
        try {
          // Fetch admin users of the agency
          const { data: admins } = await anonClient
            .from("agency_users")
            .select("user_id")
            .eq("agency_id", tokenData.agency_id)
            .in("role", ["owner", "admin"]);

          if (admins && admins.length > 0) {
            const notifications = admins.map((admin: any) => ({
              user_id: admin.user_id,
              agency_id: tokenData.agency_id,
              type: "system",
              priority: "high",
              title: "🚨 Alerta de Churn",
              message: `Cliente ${tokenData.client_name} deu nota ${selectedScore} no NPS.`,
              action_url: "/dashboard/nps",
              action_label: "Ver NPS",
              entity_type: "nps",
              entity_id: tokenData.client_id,
              action_type: `nps_detractor_${tokenData.period}`,
            }));

            await anonClient.from("notifications").insert(notifications);
          }
        } catch (e) {
          console.error("Failed to create churn alert:", e);
        }
      }

      setSubmitted(true);
    } catch (error: any) {
      console.error("Submit error:", error);
      setError("Erro ao enviar sua resposta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold text-emerald-700">Obrigado!</h2>
            <p className="text-muted-foreground">
              Sua avaliação é muito importante para nós. Vamos trabalhar para melhorar cada vez mais!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const feedbackConfig = getFeedbackConfig(selectedScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardContent className="pt-8 pb-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <MessageSquareHeart className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">
              Olá, {tokenData?.client_name}!
            </h1>
            <p className="text-muted-foreground">Como está nossa parceria?</p>
          </div>

          {/* Score Guide */}
          <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
            <p className="text-sm font-medium mb-2">📊 Guia de avaliação:</p>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span><strong>0-6:</strong> Insatisfeito — Algo está errado e precisa de atenção</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <span><strong>7-8:</strong> Satisfeito — Bom, mas pode melhorar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span><strong>9-10:</strong> Muito satisfeito — Excelente experiência!</span>
              </div>
            </div>
          </div>

          {/* Score Selector */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">
              De 0 a 10, o quanto você recomendaria nossos serviços?
            </p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedScore(i)}
                  className={`
                    aspect-square rounded-lg text-sm font-bold transition-all duration-200
                    ${selectedScore === i
                      ? `${getScoreColor(i)} ring-2 ring-offset-2 ring-primary scale-110`
                      : "bg-muted hover:bg-muted/80 text-foreground"
                    }
                  `}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Nada provável</span>
              <span>Muito provável</span>
            </div>
          </div>

          {/* Dynamic Feedback */}
          {feedbackConfig && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={feedbackConfig.placeholder}
                className={`min-h-[100px] transition-colors ${feedbackConfig.className}`}
                rows={4}
              />
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={selectedScore === null || submitting}
            className="w-full h-12 text-base"
            size="lg"
          >
            {submitting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
            Enviar Avaliação
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
