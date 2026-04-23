import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Check,
  Pencil,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { AttachmentsDisplay, type Attachment } from "@/components/ui/file-attachments";
import { toast, Toaster } from "sonner";

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
  agency: { name: string; logo_url: string | null; contact_phone: string | null };
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

const isImage = (a: Attachment) => /^image\//i.test(a.type ?? "");
const isVideo = (a: Attachment) => /^video\//i.test(a.type ?? "");

export default function PublicApproval() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApprovalPayload | null>(null);
  const [errorState, setErrorState] = useState<ErrorPayload | null>(null);
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [revisionOpen, setRevisionOpen] = useState<Record<string, boolean>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forceReview, setForceReview] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorState(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/approval-get?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorState(json as ErrorPayload);
        setData(null);
      } else {
        setData(json as ApprovalPayload);
      }
    } catch {
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

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setCurrentIndex(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  const submitDecision = async (
    item: ApprovalItem,
    decision: "approved" | "revision"
  ) => {
    if (!token) return;
    const feedback =
      decision === "revision" ? (feedbacks[item.task_id] ?? "").trim() : null;
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
        body: JSON.stringify({ token, task_id: item.task_id, decision, feedback }),
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
        decision === "approved"
          ? "Aprovação registrada. Obrigado!"
          : "Solicitação enviada à equipe."
      );

      let nextItems: ApprovalItem[] = [];
      setData((prev) => {
        if (!prev) return prev;
        nextItems = prev.items.map((i) =>
          i.task_id === item.task_id
            ? {
                ...i,
                decision,
                client_feedback: feedback,
                decided_at: new Date().toISOString(),
              }
            : i
        );
        return { ...prev, items: nextItems };
      });
      setRevisionOpen((s) => ({ ...s, [item.task_id]: false }));

      // Auto-advance to next pending
      setTimeout(() => {
        const idx = nextItems.findIndex((it, i) => i > currentIndex && !it.decision);
        if (idx >= 0 && carouselApi) {
          carouselApi.scrollTo(idx);
        }
      }, 250);
    } catch {
      toast.error("Erro de rede ao enviar resposta.");
    } finally {
      setSubmittingId(null);
    }
  };

  const allDone = useMemo(
    () => !!data && data.items.length > 0 && data.items.every((i) => !!i.decision),
    [data]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="top-center" richColors closeButton />
        <CenterShell>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando aprovação…</p>
        </CenterShell>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="top-center" richColors closeButton />
        <ExpiredOrErrorScreen error={errorState} />
      </div>
    );
  }

  if (!data) return null;

  if (allDone && !forceReview) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Toaster position="top-center" richColors closeButton />
        <AllDoneScreen
          agency={data.agency}
          onReview={() => {
            setForceReview(true);
            setTimeout(() => carouselApi?.scrollTo(0), 50);
          }}
        />
      </div>
    );
  }

  const totalDecided = data.items.filter((i) => i.decision).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Toaster position="top-center" richColors closeButton />

      {/* Header minimalista */}
      <header className="py-4 px-5 text-center border-b border-border/50">
        {data.agency.logo_url ? (
          <img
            src={data.agency.logo_url}
            alt={data.agency.name}
            className="h-10 mx-auto object-contain"
          />
        ) : (
          <div className="text-base font-medium tracking-tight">{data.agency.name}</div>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {totalDecided} de {data.items.length} respondidas
        </p>
      </header>

      {/* Galeria */}
      <main className="flex-1 flex items-center py-6">
        <div className="w-full max-w-xl mx-auto px-4">
          <Carousel className="w-full" setApi={setCarouselApi} opts={{ align: "start" }}>
            <CarouselContent>
              {data.items.map((item) => (
                <CarouselItem key={item.id}>
                  <GalleryStage item={item} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>

          {/* Pip indicators */}
          {data.items.length > 1 && (
            <div className="flex gap-1.5 justify-center mt-4">
              {data.items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => carouselApi?.scrollTo(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? "bg-primary w-4" : "bg-muted w-1.5"
                  }`}
                  aria-label={`Ir para arte ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Sticky action bar */}
      {data.items[currentIndex] && (
        <StickyActionBar
          item={data.items[currentIndex]}
          submitting={submittingId === data.items[currentIndex].task_id}
          revisionOpen={!!revisionOpen[data.items[currentIndex].task_id]}
          setRevisionOpen={(v) =>
            setRevisionOpen((s) => ({ ...s, [data.items[currentIndex].task_id]: v }))
          }
          feedback={feedbacks[data.items[currentIndex].task_id] ?? ""}
          setFeedback={(v) =>
            setFeedbacks((s) => ({ ...s, [data.items[currentIndex].task_id]: v }))
          }
          onSubmit={submitDecision}
          canScrollNext={currentIndex < data.items.length - 1}
          onNext={() => carouselApi?.scrollNext()}
        />
      )}
    </div>
  );
}

/* ============== Gallery Stage (palco do criativo) ============== */

function GalleryStage({ item }: { item: ApprovalItem }) {
  const heroImage = item.attachments?.find(isImage);
  const heroVideo = item.attachments?.find(isVideo);
  const otherAttachments = item.attachments?.filter(
    (a) => a !== heroImage && a !== heroVideo
  );

  const isLongDesc =
    !!item.description &&
    (item.description.length > 280 || (item.description.match(/\n\n/g)?.length ?? 0) >= 3);
  const previewDesc = item.description ?? "";

  return (
    <div className="space-y-4">
      {/* Palco */}
      <div className="relative w-full h-[55vh] sm:h-[62vh] rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/5">
        {heroImage && (
          <>
            {/* Glass blur */}
            <img
              src={heroImage.url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110"
            />
            <img
              src={heroImage.url}
              alt={item.title}
              className="relative h-full w-full object-contain"
            />
          </>
        )}
        {!heroImage && heroVideo && (
          <video
            src={heroVideo.url}
            controls
            className="relative h-full w-full object-contain bg-black"
          />
        )}
        {!heroImage && !heroVideo && (
          <div className="h-full w-full flex items-center justify-center text-white/60 text-sm">
            Sem prévia visual disponível
          </div>
        )}

        {/* Decision badge no topo */}
        {item.decision && (
          <div className="absolute top-3 left-3">
            <span
              className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md ${
                item.decision === "approved"
                  ? "bg-emerald-500/90 text-white"
                  : "bg-amber-500/90 text-white"
              }`}
            >
              {item.decision === "approved" ? "✓ Aprovado" : "✏ Ajuste enviado"}
            </span>
          </div>
        )}
      </div>

      {/* Texto */}
      <div className="px-1">
        <h2 className="text-base font-semibold tracking-tight">{item.title}</h2>
        {previewDesc && (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed">
            {previewDesc}
          </p>
        )}

        {isLongDesc && <FullCaptionDrawer item={item} />}

        {item.decision === "revision" && item.client_feedback && (
          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Seu pedido de ajuste:
            </p>
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              "{item.client_feedback}"
            </p>
          </div>
        )}

        {/* Anexos secundários */}
        {otherAttachments && otherAttachments.length > 0 && (
          <div className="mt-4">
            <AttachmentsDisplay attachments={otherAttachments} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== Drawer de legenda completa ============== */

function FullCaptionDrawer({ item }: { item: ApprovalItem }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 -ml-2 h-8 text-xs text-primary"
        onClick={() => setOpen(true)}
      >
        Ler legenda completa
        <ChevronDown className="h-3.5 w-3.5 ml-1" />
      </Button>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-left">{item.title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {item.description}
          </p>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* ============== Sticky Action Bar ============== */

function StickyActionBar({
  item,
  submitting,
  revisionOpen,
  setRevisionOpen,
  feedback,
  setFeedback,
  onSubmit,
  canScrollNext,
  onNext,
}: {
  item: ApprovalItem;
  submitting: boolean;
  revisionOpen: boolean;
  setRevisionOpen: (v: boolean) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  onSubmit: (item: ApprovalItem, decision: "approved" | "revision") => Promise<void>;
  canScrollNext: boolean;
  onNext: () => void;
}) {
  const decided = !!item.decision;

  return (
    <div className="sticky bottom-0 inset-x-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
      <div className="max-w-xl mx-auto">
        {decided ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {item.decision === "approved"
                ? "✓ Aprovado por você"
                : "✏ Ajuste enviado"}
            </span>
            {canScrollNext && (
              <Button size="lg" onClick={onNext}>
                Próxima arte
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        ) : revisionOpen ? (
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600">
                Descreva o ajuste
              </span>
              <span
                className={`text-[11px] tabular-nums ${
                  feedback.length > 500 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {feedback.length}/500
              </span>
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="Descreva o ajuste necessário com clareza…"
              rows={3}
              className="resize-none"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => setRevisionOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => onSubmit(item, "revision")}
                disabled={submitting || feedback.trim().length === 0}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Enviar ajuste
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onSubmit(item, "approved")}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Aprovar Arte
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setRevisionOpen(true)}
              disabled={submitting}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Solicitar Ajuste
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== All Done Screen ============== */

function AllDoneScreen({
  agency,
  onReview,
}: {
  agency: ApprovalPayload["agency"];
  onReview: () => void;
}) {
  const phoneDigits = (agency.contact_phone ?? "").replace(/\D/g, "");
  const waUrl = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Olá! Acabei de aprovar a arte de ${agency.name} 👋`
      )}`
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="animate-in zoom-in-50 fade-in duration-500">
        <CheckCircle2 className="h-20 w-20 text-emerald-500 mx-auto" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Tudo pronto!</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        Agradecemos o seu feedback. A agência já foi notificada.
      </p>

      <div className="flex flex-col gap-3 mt-8 w-full max-w-xs">
        {waUrl && (
          <Button
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            asChild
          >
            <a href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageSquare className="h-4 w-4 mr-2" />
              Falar com o meu Gestor
            </a>
          </Button>
        )}
        <Button size="lg" variant="outline" onClick={onReview}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rever aprovações
        </Button>
      </div>

      <footer className="mt-16 text-[11px] uppercase tracking-[0.25em] text-muted-foreground/60">
        {agency.name} · Powered by Orbity
      </footer>
    </div>
  );
}

/* ============== Shells ============== */

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
      <Card className="max-w-lg w-full">
        <CardContent className="pt-10 pb-8 px-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-6">
            {isExpired ? (
              <Clock className="h-7 w-7 text-muted-foreground" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-3">
            {error.error === "completed"
              ? "Aprovação concluída"
              : isExpired
              ? "Link expirado"
              : "Link indisponível"}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{error.message}</p>
          <Button
            variant="ghost"
            className="mt-8"
            onClick={() =>
              window.history.length > 1 ? window.history.back() : window.close()
            }
          >
            Voltar
          </Button>
        </CardContent>
      </Card>
    </CenterShell>
  );
}
