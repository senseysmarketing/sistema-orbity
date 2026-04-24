import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import { resolveBrandTheme, type BrandThemeKey } from "@/lib/brandThemes";

interface ApprovalItem {
  id: string;
  task_id: string;
  decision: "approved" | "revision" | null;
  client_feedback: string | null;
  decided_at: string | null;
  title: string;
  description: string;
  attachments: Attachment[];
  post_caption?: string | null;
}

interface ApprovalPayload {
  agency: {
    name: string;
    logo_url: string | null;
    contact_phone: string | null;
    brand_theme?: BrandThemeKey | null;
    public_email?: string | null;
    public_phone?: string | null;
    website_url?: string | null;
  };
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

/* ============== Animation Variants (matching PublicClientReport) ============== */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const headerVariants = {
  hidden: { opacity: 0, y: -40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

/* ============== Cinematic Background Shell ============== */

function CinematicShell({
  children,
  themeKey,
  agency,
}: {
  children: React.ReactNode;
  themeKey?: BrandThemeKey | null;
  agency?: ApprovalPayload["agency"] | null;
}) {
  const t = resolveBrandTheme(themeKey);
  return (
    <div className={`relative min-h-screen overflow-hidden ${t.bgClass} text-white`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={t.overlayStyle}
      />
      <div className="relative z-10 flex min-h-screen flex-col">{children}</div>

      {/* Agency contact footer */}
      {agency && (agency.public_email || agency.public_phone || agency.website_url) && (
        <div className="relative z-10 px-4 pb-14 pt-2">
          <p className="text-[10px] text-white/40 text-center">
            {[agency.public_phone, agency.public_email, agency.website_url]
              .filter(Boolean)
              .join("  ·  ")}
          </p>
        </div>
      )}

      {/* Global Powered by Orbity footer */}
      <div className="fixed bottom-2 inset-x-0 text-center pointer-events-none z-10">
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">
          Powered by Orbity
        </span>
      </div>
    </div>
  );
}

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
  const [successPulse, setSuccessPulse] = useState<"approved" | "revision" | null>(null);

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

  // Dynamic favicon (white-label) — restores original on unmount
  useEffect(() => {
    const logo = data?.agency?.logo_url;
    if (!logo) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    let created = false;
    let prevHref: string | null = null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
      created = true;
    } else {
      prevHref = link.href;
    }
    link.href = logo;
    // Update tab title with agency name
    const prevTitle = document.title;
    if (data?.agency?.name) {
      document.title = `Aprovação · ${data.agency.name}`;
    }
    return () => {
      if (created && link?.parentNode) {
        link.parentNode.removeChild(link);
      } else if (link && prevHref) {
        link.href = prevHref;
      }
      document.title = prevTitle;
    };
  }, [data?.agency?.logo_url, data?.agency?.name]);

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

      // Premium success pulse
      setSuccessPulse(decision);
      setTimeout(() => setSuccessPulse(null), 700);

      // Auto-advance to next pending
      setTimeout(() => {
        const idx = nextItems.findIndex((it, i) => i > currentIndex && !it.decision);
        if (idx >= 0 && carouselApi) {
          carouselApi.scrollTo(idx);
        }
      }, 450);
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
      <CinematicShell>
        <Toaster position="top-center" theme="dark" closeButton />
        <CenterShell>
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
          <p className="mt-4 text-sm text-white/50">Carregando aprovação…</p>
        </CenterShell>
      </CinematicShell>
    );
  }

  if (errorState) {
    return (
      <CinematicShell>
        <Toaster position="top-center" theme="dark" closeButton />
        <ExpiredOrErrorScreen error={errorState} />
      </CinematicShell>
    );
  }

  if (!data) return null;

  if (allDone && !forceReview) {
    return (
      <CinematicShell>
        <Toaster position="top-center" theme="dark" closeButton />
        <AllDoneScreen
          agency={data.agency}
          onReview={() => {
            setForceReview(true);
            setTimeout(() => carouselApi?.scrollTo(0), 50);
          }}
        />
      </CinematicShell>
    );
  }

  const totalDecided = data.items.filter((i) => i.decision).length;
  const allApproved = totalDecided === data.items.length;

  return (
    <CinematicShell>
      <Toaster position="top-center" theme="dark" closeButton />

      {/* Premium Header */}
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        className="px-5 pt-8 pb-5 text-center"
      >
        <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-white/40 mb-3">
          Aprovação de Conteúdo
        </div>
        {data.agency.logo_url ? (
          <img
            src={data.agency.logo_url}
            alt={data.agency.name}
            className="h-10 mx-auto object-contain rounded-lg shadow-lg"
          />
        ) : (
          <div className="text-xl font-bold tracking-tight text-white">
            {data.agency.name}
          </div>
        )}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                allApproved ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                allApproved ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </span>
          <span className="text-xs text-white/60">
            {allApproved ? "Tudo aprovado" : "Aguardando você"}
          </span>
        </div>
        <p className="mt-2 text-xs text-white/50">
          {totalDecided} de {data.items.length} respondidas
        </p>
      </motion.header>

      {/* Galeria */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex items-center pb-40"
      >
        <div className="w-full max-w-xl mx-auto px-4">
          <motion.div variants={itemVariants}>
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-3">
              <Carousel className="w-full" setApi={setCarouselApi} opts={{ align: "start" }}>
                <CarouselContent>
                  {data.items.map((item) => (
                    <CarouselItem key={item.id}>
                      <GalleryStage item={item} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:text-white" />
                <CarouselNext className="hidden sm:flex bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:text-white" />
              </Carousel>

              {/* Success pulse overlay */}
              <AnimatePresence>
                {successPulse && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-black/40 backdrop-blur-sm z-10"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2
                        className={`h-20 w-20 ${
                          successPulse === "approved"
                            ? "text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]"
                            : "text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.7)]"
                        }`}
                      />
                      <span className="text-sm font-medium text-white/90">
                        {successPulse === "approved" ? "Aprovado!" : "Ajuste enviado"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Pip indicators premium */}
          {data.items.length > 1 && (
            <motion.div variants={itemVariants} className="flex gap-1.5 justify-center mt-5">
              {data.items.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => carouselApi?.scrollTo(idx)}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    idx === currentIndex
                      ? "w-6 bg-gradient-to-r from-blue-500 to-violet-500"
                      : "w-1.5 bg-white/10 hover:bg-white/20"
                  }`}
                  aria-label={`Ir para arte ${idx + 1}`}
                />
              ))}
            </motion.div>
          )}
        </div>
      </motion.main>

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
    </CinematicShell>
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
      <div className="relative w-full h-[55vh] sm:h-[62vh] rounded-2xl overflow-hidden bg-black ring-1 ring-white/10">
        {heroImage && (
          <>
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

        {/* Top radial glow overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(255,255,255,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Decision badge */}
        {item.decision && (
          <div className="absolute top-3 left-3">
            <span
              className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md border ${
                item.decision === "approved"
                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                  : "bg-amber-500/20 border-amber-400/30 text-amber-200"
              }`}
            >
              {item.decision === "approved" ? "✓ Aprovado" : "✏ Ajuste enviado"}
            </span>
          </div>
        )}
      </div>

      {/* Legenda Proposta — logo abaixo do carrossel de mídias (Quiet Luxury) */}
      {item.post_caption && item.post_caption.trim().length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-6 shadow-lg">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3 flex items-center gap-2">
            <span className="h-px w-4 bg-white/20" />
            Legenda Proposta
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90 font-light">
            {item.post_caption}
          </p>
        </div>
      )}

      {/* Texto */}
      <div className="px-1">
        <h2 className="text-base font-semibold tracking-tight text-white">{item.title}</h2>
        {previewDesc && (
          <p className="mt-2 text-sm text-white/60 whitespace-pre-wrap line-clamp-3 leading-relaxed">
            {previewDesc}
          </p>
        )}

        {isLongDesc && <FullCaptionDrawer item={item} />}

        {item.decision === "revision" && item.client_feedback && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
            <p className="text-xs font-medium text-amber-300">Seu pedido de ajuste:</p>
            <p className="text-xs text-amber-100/70 mt-1 whitespace-pre-wrap">
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
        className="mt-1 -ml-2 h-8 text-xs text-blue-400 hover:text-blue-300 hover:bg-white/5 group"
        onClick={() => setOpen(true)}
      >
        Ler legenda completa
        <ChevronDown className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-y-0.5" />
      </Button>
      <DrawerContent className="bg-[#0a0a1a] border-t border-white/10 text-white">
        <DrawerHeader>
          <DrawerTitle className="text-left text-white">{item.title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/80">
            {item.description}
          </p>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 hover:text-white"
            >
              Fechar
            </Button>
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
  const needsPanel = decided || revisionOpen;

  return (
    <div className="fixed bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md pb-[env(safe-area-inset-bottom)]">
      <div
        className={
          needsPanel
            ? "bg-[#0a0a1a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/50"
            : ""
        }
      >
        {decided ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/60">
              {item.decision === "approved"
                ? "✓ Aprovado por você"
                : "✏ Ajuste enviado"}
            </span>
            {canScrollNext && (
              <Button
                size="lg"
                onClick={onNext}
                className="bg-white/10 backdrop-blur-xl border border-white/15 text-white hover:bg-white/20"
              >
                Próxima arte
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        ) : revisionOpen ? (
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-300">
                Descreva o ajuste
              </span>
              <span
                className={`text-[11px] tabular-nums ${
                  feedback.length > 500 ? "text-red-400" : "text-white/50"
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
              className="resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/40 focus-visible:border-blue-500/50"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => setRevisionOpen(false)}
                disabled={submitting}
                className="text-white/70 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => onSubmit(item, "revision")}
                disabled={submitting || feedback.trim().length === 0}
                className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-lg shadow-blue-500/30"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-white" />
                ) : null}
                Enviar ajuste
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-shadow"
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
              onClick={() => setRevisionOpen(true)}
              disabled={submitting}
              className="bg-white/10 backdrop-blur-2xl border border-white/15 text-white hover:bg-white/20 shadow-2xl shadow-black/40"
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
    <div className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Emerald glow on top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(16,185,129,0.15) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
          <CheckCircle2 className="relative h-24 w-24 text-emerald-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]" />
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-white">Tudo pronto!</h1>
        <p className="mt-3 text-sm text-white/60 max-w-sm leading-relaxed">
          Agradecemos o seu feedback. A agência já foi notificada.
        </p>

        <div className="flex flex-col gap-3 mt-10 w-full max-w-xs">
          {waUrl && (
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-shadow"
              asChild
            >
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-2" />
                Falar com o meu Gestor
              </a>
            </Button>
          )}
          <Button
            size="lg"
            onClick={onReview}
            className="bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Rever aprovações
          </Button>
        </div>

      </motion.div>
    </div>
  );
}

/* ============== Shells ============== */

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      {children}
    </div>
  );
}

function ExpiredOrErrorScreen({ error }: { error: ErrorPayload }) {
  const isExpired = error.error === "expired" || error.error === "completed";
  return (
    <CenterShell>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-lg w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="pt-10 pb-8 px-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            {isExpired ? (
              <Clock className="h-7 w-7 text-white/60" />
            ) : (
              <AlertTriangle className="h-7 w-7 text-white/60" />
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-3 text-white">
            {error.error === "completed"
              ? "Aprovação concluída"
              : isExpired
              ? "Link expirado"
              : "Link indisponível"}
          </h1>
          <p className="text-sm text-white/50 leading-relaxed">{error.message}</p>
          <Button
            variant="ghost"
            className="mt-8 text-white/70 hover:text-white hover:bg-white/5"
            onClick={() =>
              window.history.length > 1 ? window.history.back() : window.close()
            }
          >
            Voltar
          </Button>
        </div>
      </motion.div>
    </CenterShell>
  );
}
