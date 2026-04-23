import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Clock, CheckCircle2, AlertTriangle, ShieldCheck, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AttachmentsDisplay, type Attachment } from "@/components/ui/file-attachments";
import { toast, Toaster } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApprovalItem {
  id: string;
  task_id: string;
  decision: "approved" | "revision" | null;
  client_feedback: string | null;
  decided_at: string | null;
  title: string;
  description: string;
  attachments: Attachment[];
}

interface ApprovalPayload {
  agency: { name: string; logo_url: string | null };
  token: string;
  expires_at: string;
  status: string;
  items: ApprovalItem[];
}

interface ErrorPayload {
  error: string;
  message: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function PublicApproval() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApprovalPayload | null>(null);
  const [errorState, setErrorState] = useState<ErrorPayload | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState<Record<string, boolean>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/approval-get?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorState(json as ErrorPayload);
        setData(null);
      } else {
        setData(json as ApprovalPayload);
      }
    } catch (err: any) {
      setErrorState({
        error: "network",
        message: "Não foi possível carregar o link. Verifique sua conexão.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Aprovação · Orbity";
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitDecision = async (
    item: ApprovalItem,
    decision: "approved" | "revision"
  ) => {
    if (!token) return;
    const feedback = decision === "revision" ? (feedbacks[item.task_id] ?? "").trim() : null;
    if (decision === "revision" && !feedback) {
      toast.error("Descreva o ajuste solicitado antes de enviar.");
      return;
    }
    setSubmittingId(item.task_id);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/approval-decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({
          token,
          task_id: item.task_id,
          decision,
          feedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setErrorState(json as ErrorPayload);
          setData(null);
          return;
        }
        toast.error(json.message ?? "Não foi possível registrar sua resposta.");
        return;
      }
      toast.success(
        decision === "approved" ? "Aprovação registrada. Obrigado!" : "Solicitação enviada à equipe."
      );
      // Optimistic local update
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.task_id === item.task_id
                  ? {
                      ...i,
                      decision,
                      client_feedback: feedback,
                      decided_at: new Date().toISOString(),
                    }
                  : i
              ),
            }
          : prev
      );
      setFeedbackOpen((s) => ({ ...s, [item.task_id]: false }));
    } catch (err: any) {
      toast.error("Erro de rede ao enviar resposta.");
    } finally {
      setSubmittingId(null);
    }
  };

  const expiresLabel = useMemo(() => {
    if (!data?.expires_at) return null;
    try {
      return format(new Date(data.expires_at), "PPP 'às' HH:mm", { locale: ptBR });
    } catch {
      return null;
    }
  }, [data?.expires_at]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Toaster position="top-center" richColors closeButton />
      {loading ? (
        <CenterShell>
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <p className="mt-4 text-sm text-neutral-500">Carregando aprovação…</p>
        </CenterShell>
      ) : errorState ? (
        <ExpiredOrErrorScreen error={errorState} />
      ) : data ? (
        <ApprovalContent
          data={data}
          feedbackOpen={feedbackOpen}
          setFeedbackOpen={setFeedbackOpen}
          feedbacks={feedbacks}
          setFeedbacks={setFeedbacks}
          submittingId={submittingId}
          onSubmit={submitDecision}
          expiresLabel={expiresLabel}
        />
      ) : null}
    </div>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {children}
    </div>
  );
}

function ExpiredOrErrorScreen({ error }: { error: ErrorPayload }) {
  const isExpired = error.error === "expired" || error.error === "completed";
  return (
    <CenterShell>
      <Card className="max-w-lg w-full border-neutral-200 shadow-sm">
        <CardContent className="pt-10 pb-8 px-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center mb-6">
            {isExpired ? (
              <Clock className="h-7 w-7 text-neutral-500" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-neutral-500" />
            )}
          </div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight mb-3">
            {error.error === "completed"
              ? "Aprovação concluída"
              : isExpired
              ? "Link expirado"
              : "Link indisponível"}
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">{error.message}</p>
          <Button
            variant="ghost"
            className="mt-8 text-neutral-500 hover:text-neutral-900"
            onClick={() => window.history.length > 1 ? window.history.back() : window.close()}
          >
            Voltar
          </Button>
        </CardContent>
      </Card>
    </CenterShell>
  );
}

interface ContentProps {
  data: ApprovalPayload;
  feedbackOpen: Record<string, boolean>;
  setFeedbackOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  feedbacks: Record<string, string>;
  setFeedbacks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  submittingId: string | null;
  onSubmit: (item: ApprovalItem, decision: "approved" | "revision") => Promise<void>;
  expiresLabel: string | null;
}

function ApprovalContent({
  data,
  feedbackOpen,
  setFeedbackOpen,
  feedbacks,
  setFeedbacks,
  submittingId,
  onSubmit,
  expiresLabel,
}: ContentProps) {
  const isBatch = data.items.length > 1;
  const totalDecided = data.items.filter((i) => i.decision).length;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      {/* Header */}
      <header className="text-center mb-12">
        {data.agency.logo_url ? (
          <img
            src={data.agency.logo_url}
            alt={data.agency.name}
            className="h-12 mx-auto mb-6 object-contain"
          />
        ) : (
          <div className="h-12 mb-6 flex items-center justify-center">
            <span className="text-xs uppercase tracking-[0.3em] text-neutral-400">
              {data.agency.name}
            </span>
          </div>
        )}
        <h1 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-neutral-900">
          Aprovação de conteúdo
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          {isBatch
            ? `${data.items.length} peças aguardando sua avaliação`
            : "Sua avaliação final, em poucos cliques."}
        </p>
        {expiresLabel && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Link válido até {expiresLabel}
          </p>
        )}
        {isBatch && (
          <div className="mt-3 text-xs text-neutral-500">
            {totalDecided} de {data.items.length} respondidas
          </div>
        )}
      </header>

      {/* Items */}
      {isBatch ? (
        <Carousel className="w-full">
          <CarouselContent>
            {data.items.map((item) => (
              <CarouselItem key={item.id}>
                <ItemCard
                  item={item}
                  feedbackOpen={!!feedbackOpen[item.task_id]}
                  setFeedbackOpen={(v) =>
                    setFeedbackOpen((s) => ({ ...s, [item.task_id]: v }))
                  }
                  feedback={feedbacks[item.task_id] ?? ""}
                  setFeedback={(v) =>
                    setFeedbacks((s) => ({ ...s, [item.task_id]: v }))
                  }
                  submitting={submittingId === item.task_id}
                  onSubmit={onSubmit}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex" />
          <CarouselNext className="hidden sm:flex" />
        </Carousel>
      ) : (
        data.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            feedbackOpen={!!feedbackOpen[item.task_id]}
            setFeedbackOpen={(v) =>
              setFeedbackOpen((s) => ({ ...s, [item.task_id]: v }))
            }
            feedback={feedbacks[item.task_id] ?? ""}
            setFeedback={(v) =>
              setFeedbacks((s) => ({ ...s, [item.task_id]: v }))
            }
            submitting={submittingId === item.task_id}
            onSubmit={onSubmit}
          />
        ))
      )}

      <footer className="mt-16 text-center text-[11px] uppercase tracking-[0.25em] text-neutral-300">
        Powered by Orbity
      </footer>
    </div>
  );
}

interface ItemCardProps {
  item: ApprovalItem;
  feedbackOpen: boolean;
  setFeedbackOpen: (v: boolean) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  submitting: boolean;
  onSubmit: (item: ApprovalItem, decision: "approved" | "revision") => Promise<void>;
}

function ItemCard({
  item,
  feedbackOpen,
  setFeedbackOpen,
  feedback,
  setFeedback,
  submitting,
  onSubmit,
}: ItemCardProps) {
  const decided = !!item.decision;

  return (
    <Card className="border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] bg-white">
      <CardContent className="p-6 sm:p-10">
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-serif font-semibold tracking-tight text-neutral-900">
            {item.title}
          </h2>
          {item.description && (
            <p className="mt-3 text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        <Separator className="my-6 bg-neutral-100" />

        {/* Attachments */}
        {item.attachments && item.attachments.length > 0 ? (
          <AttachmentsDisplay attachments={item.attachments} />
        ) : (
          <div className="text-sm text-neutral-400 italic py-6 text-center">
            Sem arquivos anexados.
          </div>
        )}

        {/* Decision */}
        <div className="mt-8">
          {decided ? (
            <DecidedBanner item={item} />
          ) : feedbackOpen ? (
            <RevisionForm
              feedback={feedback}
              setFeedback={setFeedback}
              submitting={submitting}
              onCancel={() => setFeedbackOpen(false)}
              onConfirm={() => onSubmit(item, "revision")}
            />
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onSubmit(item, "approved")}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Aprovar
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                onClick={() => setFeedbackOpen(true)}
                disabled={submitting}
              >
                <MessageSquareWarning className="h-4 w-4 mr-2" />
                Solicitar Ajuste
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DecidedBanner({ item }: { item: ApprovalItem }) {
  if (item.decision === "approved") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-5 py-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Aprovado por você</p>
          <p className="text-xs text-emerald-700/80 mt-0.5">
            Obrigado! A equipe foi notificada.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <MessageSquareWarning className="h-5 w-5 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">Ajuste solicitado</p>
          {item.client_feedback && (
            <p className="text-sm text-amber-800/90 mt-2 whitespace-pre-wrap leading-relaxed">
              "{item.client_feedback}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function RevisionForm({
  feedback,
  setFeedback,
  submitting,
  onCancel,
  onConfirm,
}: {
  feedback: string;
  setFeedback: (v: string) => void;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const remaining = 500 - feedback.length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
          Ajuste solicitado
        </Badge>
        <span className={`text-[11px] tabular-nums ${remaining < 0 ? "text-red-500" : "text-neutral-400"}`}>
          {feedback.length}/500
        </span>
      </div>
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
        maxLength={500}
        placeholder="Descreva o ajuste necessário com clareza para acelerar a próxima entrega…"
        rows={5}
        className="resize-none border-neutral-200 focus-visible:ring-amber-300"
      />
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button
          variant="ghost"
          className="sm:w-32 text-neutral-500"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={onConfirm}
          disabled={submitting || feedback.trim().length === 0}
        >
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enviar solicitação
        </Button>
      </div>
    </div>
  );
}
