import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Wifi, TrendingUp, DollarSign, Target, BarChart3, ArrowDown, Eye, MousePointerClick } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { resolveBrandTheme, type BrandThemeKey } from "@/lib/brandThemes";

interface ResultByObjective {
  label: string;
  actionType: string;
  total: number;
  spend: number;
  costPerResult: number | null;
  campaignCount: number;
}

interface CampaignBreakdownItem {
  name: string;
  objective: string;
  result_value: number;
  result_label: string;
  result_action_type: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cost_per_result: number | null;
}

interface ReportData {
  client_name: string;
  agency_name: string;
  agency_logo: string | null;
  metrics: {
    spend: number;
    conversions: number;
    cpa: number;
    active_campaigns: number;
    impressions?: number;
    clicks?: number;
    cpm?: number;
    cpc?: number;
    ctr?: number;
  };
  top_campaigns: Array<{
    name: string;
    objective: string;
    spend: number;
    conversions: number;
    result_label?: string;
    result_action_type?: string;
    impressions?: number;
    clicks?: number;
    ctr?: number;
  }>;
  chart_data?: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
  is_mock: boolean;
  period?: { from: string; to: string };
  actionTypeLabel?: string;
  results_by_objective?: ResultByObjective[];
  campaign_breakdown?: CampaignBreakdownItem[];
  branding?: {
    brand_theme?: BrandThemeKey | null;
    public_email?: string | null;
    public_phone?: string | null;
    website_url?: string | null;
  };
}

function CountUp({ end, duration = 1.5, prefix = "", suffix = "", decimals = 0 }: { end: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * end);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration]);

  const formatted = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString("pt-BR");
  return <span>{prefix}{formatted}{suffix}</span>;
}

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

// Fallback mock data only used when no snapshot chart_data exists
const fallbackChartData = [
  { day: "Seg", investimento: 320, conversoes: 12 },
  { day: "Ter", investimento: 480, conversoes: 18 },
  { day: "Qua", investimento: 410, conversoes: 15 },
  { day: "Qui", investimento: 560, conversoes: 24 },
  { day: "Sex", investimento: 620, conversoes: 28 },
  { day: "Sáb", investimento: 390, conversoes: 20 },
  { day: "Dom", investimento: 290, conversoes: 10 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e]/90 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white/50 text-xs mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name === "investimento" ? "Investimento" : "Conversões"}: {entry.name === "investimento" ? `R$ ${entry.value.toFixed(2)}` : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function PublicClientReport() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) { setExpired(true); setLoading(false); return; }

    const fetchReport = async () => {
      try {
        const SUPABASE_URL = "https://ovookkywclrqfmtumelw.supabase.co";
        const res = await fetch(`${SUPABASE_URL}/functions/v1/public-client-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.status === 403) {
          setExpired(true);
        } else if (res.ok) {
          const payload = await res.json();
          setData(payload);
        } else {
          setExpired(true);
        }
      } catch {
        setExpired(true);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [token]);

  // Dynamic favicon (white-label)
  useEffect(() => {
    const logo = data?.agency_logo;
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
    const prevTitle = document.title;
    document.title = `Relatório · ${data?.agency_name ?? "Orbity"}`;
    return () => {
      if (created && link?.parentNode) link.parentNode.removeChild(link);
      else if (link && prevHref) link.href = prevHref;
      document.title = prevTitle;
    };
  }, [data?.agency_logo, data?.agency_name]);

  if (loading) return <LoadingState />;
  if (expired || !data) return <ExpiredState />;
  return <ReportDashboard data={data} />;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Skeleton className="h-8 w-48 mx-auto bg-white/5" />
        <Skeleton className="h-4 w-64 mx-auto bg-white/5" />
        <div className="grid grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Link Expirado</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Por questões de segurança, este relatório ficou disponível por apenas 48 horas. 
            Por favor, solicite um novo acesso ao seu gestor na Sensey's.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ReportDashboard({ data }: { data: ReportData }) {
  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const t = resolveBrandTheme(data.branding?.brand_theme);

  const metrics = [
    { label: "Investimento", value: data.metrics.spend, icon: DollarSign, format: "currency" },
    { label: data.actionTypeLabel || "Conversões", value: data.metrics.conversions, icon: Target, format: "number" },
    { label: "Custo / Conversão", value: data.metrics.cpa, icon: TrendingUp, format: "currency" },
    { label: "Campanhas Ativas", value: data.metrics.active_campaigns, icon: BarChart3, format: "number" },
  ];

  const maxSpend = Math.max(...(data.top_campaigns.map(c => c.spend)), 1);

  // Use real snapshot data for funnel
  const totalImpressions = data.metrics.impressions || 0;
  const totalClicks = data.metrics.clicks || 0;
  const totalConversions = data.metrics.conversions || 0;

  const funnelData = [
    { label: "Impressões", value: totalImpressions, color: "#3b82f6", width: "100%", icon: Eye },
    { label: "Cliques no Link", value: totalClicks, color: "#8b5cf6", width: "85%", icon: MousePointerClick },
    { label: data.actionTypeLabel || "Conversões", value: totalConversions, color: "#10b981", width: "70%", icon: Target },
  ];

  // Use real chart data from snapshot, or fallback
  const chartData = data.chart_data && data.chart_data.length > 0
    ? data.chart_data.map(d => ({
        day: d.date,
        investimento: d.spend,
        conversoes: d.conversions,
      }))
    : fallbackChartData;

  return (
    <div className={`min-h-screen ${t.bgClass} relative overflow-hidden`}>
      <div className="absolute inset-0" style={t.overlayStyle} aria-hidden />

      <div className="relative z-10 max-w-lg mx-auto px-3 sm:px-4 py-8 pb-20">
        {/* Header */}
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          {data.agency_logo && (
            <img src={data.agency_logo} alt={data.agency_name} className="h-10 mx-auto mb-4 rounded-lg" />
          )}
          <h2 className="text-white/40 text-xs uppercase tracking-[0.2em] mb-2">
            {data.agency_name}
          </h2>
          <h1 className="text-xl font-bold text-white mb-1">
            {data.client_name}
          </h1>
          <p className="text-white/50 text-sm mb-3">
            {data.period?.from && data.period?.to
              ? `${new Date(data.period.from + 'T00:00:00').toLocaleDateString('pt-BR')} — ${new Date(data.period.to + 'T00:00:00').toLocaleDateString('pt-BR')}`
              : 'Relatório de Performance'}
          </p>
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Wifi className="h-3 w-3" />
            Ao Vivo
          </div>

          {data.is_mock && (
            <p className="text-white/30 text-[10px] mt-3">
              * Dados em cache. Conecte o Meta Ads para dados em tempo real.
            </p>
          )}
        </motion.div>

        {/* Metrics Grid - Glassmorphism Premium */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-3 sm:p-5 relative overflow-hidden min-w-0 group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Icon className="absolute top-3 right-3 h-8 w-8 text-white/[0.07]" />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Icon className="h-3.5 w-3.5 text-white/30" />
                    <span className="text-white/40 text-[11px] font-medium uppercase tracking-wider">
                      {metric.label}
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight truncate" style={{ textShadow: "0 0 40px rgba(255,255,255,0.15)" }}>
                    {metric.format === "currency" ? (
                      <CountUp end={metric.value} prefix="R$ " decimals={2} />
                    ) : (
                      <CountUp end={metric.value} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Area Chart - Evolução */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <h3 className="text-white/50 text-xs uppercase tracking-[0.15em] mb-4 font-medium">
            Evolução no Período
          </h3>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-5">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="investimento" name="investimento" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                <Area type="monotone" dataKey="conversoes" name="conversoes" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConversions)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                <span className="text-white/40 text-[11px]">Investimento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-white/40 text-[11px]">Conversões</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Funil do Tráfego */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <h3 className="text-white/50 text-xs uppercase tracking-[0.15em] mb-4 font-medium">
            Funil do Tráfego
          </h3>
          <div className="flex flex-col items-center gap-0">
            {funnelData.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex flex-col items-center w-full">
                  {i > 0 && (
                    <ArrowDown className="h-5 w-5 text-white/20 my-1.5" />
                  )}
                  <div
                    className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl px-3 py-3 sm:px-5 sm:py-4 flex items-center justify-between transition-all duration-300 min-w-0"
                    style={{ width: step.width }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${step.color}15` }}>
                        <Icon className="h-4 w-4" style={{ color: step.color }} />
                      </div>
                      <span className="text-white/60 text-xs sm:text-sm font-medium">{step.label}</span>
                    </div>
                    <span className="text-white font-black text-base sm:text-lg tracking-tight" style={{ textShadow: `0 0 20px ${step.color}30` }}>
                      <CountUp end={step.value} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Resultados por Objetivo (dynamic) */}
        {data.results_by_objective && data.results_by_objective.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8"
          >
            <h3 className="text-white/50 text-xs uppercase tracking-[0.15em] mb-4 font-medium">
              Resultados por Objetivo
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {data.results_by_objective.map((r, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-semibold">{r.label}</p>
                    <p className="text-white/40 text-[11px]">
                      {r.campaignCount} campanha(s) · {formatCurrency(r.spend)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-xl font-black tracking-tight">
                      <CountUp end={r.total} />
                    </p>
                    {r.costPerResult !== null && isFinite(r.costPerResult) && (
                      <p className="text-white/40 text-[11px]">CPR: {formatCurrency(r.costPerResult)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Campaigns */}
        {data.top_campaigns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3 className="text-white/50 text-xs uppercase tracking-[0.15em] mb-4 font-medium">
              Top Performance
            </h3>
            <div className="space-y-3">
              {data.top_campaigns.map((campaign, i) => {
                const cpa = campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;
                const labelLower = (campaign.result_label || data.actionTypeLabel || "conversão").toLowerCase();
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + i * 0.15 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-sm font-medium truncate max-w-[60%]">
                        {campaign.name}
                      </span>
                      <span className="text-white/50 text-xs">
                        {formatCurrency(campaign.spend)}
                      </span>
                    </div>
                    <Progress
                      value={(campaign.spend / maxSpend) * 100}
                      className="h-1.5 bg-white/[0.06] [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-violet-500"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      {campaign.conversions > 0 && (
                        <p className="text-white/30 text-[11px]">
                          {campaign.conversions} {labelLower}
                        </p>
                      )}
                      {cpa > 0 && (
                        <p className="text-white/40 text-[11px] font-medium">
                          CPR: {formatCurrency(cpa)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Agency contact footer (white-label) */}
        {data.branding && (data.branding.public_email || data.branding.public_phone || data.branding.website_url) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.7 }}
            className="text-center mt-10"
          >
            <p className="text-white/40 text-[11px]">
              {[data.branding.public_phone, data.branding.public_email, data.branding.website_url]
                .filter(Boolean)
                .join("  ·  ")}
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="text-center mt-6"
        >
          <p className="text-white/20 text-[11px]">
            Gerado por <span className="text-white/30 font-medium">{data.agency_name}</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
