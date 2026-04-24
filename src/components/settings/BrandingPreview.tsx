import { resolveBrandTheme, type BrandThemeKey } from "@/lib/brandThemes";
import { CheckCircle2, BarChart3, Eye, MousePointerClick, Target } from "lucide-react";

interface BrandingPreviewProps {
  theme: BrandThemeKey;
  logoUrl?: string | null;
  agencyName: string;
  publicEmail?: string | null;
  publicPhone?: string | null;
  websiteUrl?: string | null;
}

export function BrandingPreview({
  theme,
  logoUrl,
  agencyName,
  publicEmail,
  publicPhone,
  websiteUrl,
}: BrandingPreviewProps) {
  const t = resolveBrandTheme(theme);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Pré-visualização ao vivo
        </p>
      </div>

      {/* Mobile mockup - Approval */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-2 font-medium">
          📱 Aprovação de tarefas
        </p>
        <div className="mx-auto w-full max-w-[260px] rounded-[2rem] border-4 border-foreground/10 bg-foreground/5 p-2 shadow-xl">
          <div
            className={`relative ${t.bgClass} rounded-[1.5rem] overflow-hidden h-[440px] flex flex-col`}
          >
            <div className="absolute inset-0" style={t.overlayStyle} aria-hidden />
            <div className="relative z-10 flex-1 flex flex-col items-center pt-8 px-4">
              <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 mb-2">
                Aprovação de Conteúdo
              </p>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={agencyName}
                  className="h-7 object-contain mb-3"
                />
              ) : (
                <p className="text-sm font-bold text-white mb-3">{agencyName}</p>
              )}
              <div
                className="w-full h-[180px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3"
                style={{ backdropFilter: "blur(10px)" }}
              >
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2
                    className="h-10 w-10"
                    style={{ color: t.accent }}
                  />
                  <span className="text-[10px] text-white/60">
                    Prévia do criativo
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="rounded-lg bg-emerald-600 text-white text-[10px] font-medium py-2 text-center">
                  Aprovar
                </div>
                <div className="rounded-lg bg-white/10 border border-white/15 text-white text-[10px] py-2 text-center">
                  Ajustar
                </div>
              </div>
            </div>
            <PreviewFooter
              email={publicEmail}
              phone={publicPhone}
              website={websiteUrl}
            />
          </div>
        </div>
      </div>

      {/* Desktop mockup - Report */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-2 font-medium">
          🖥️ Relatório de tráfego
        </p>
        <div className="rounded-xl border-4 border-foreground/10 overflow-hidden shadow-xl">
          <div className="bg-foreground/10 h-4 flex items-center px-2 gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          </div>
          <div
            className={`relative ${t.bgClass} h-[200px] overflow-hidden`}
          >
            <div className="absolute inset-0" style={t.overlayStyle} aria-hidden />
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-center mb-2">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={agencyName}
                    className="h-6 object-contain"
                  />
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">
                    {agencyName}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { i: BarChart3, l: "Invest." },
                  { i: Target, l: "Conv." },
                  { i: Eye, l: "Impress." },
                ].map(({ i: Icon, l }, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/10 bg-white/5 p-2 text-center"
                  >
                    <Icon
                      className="h-3 w-3 mx-auto mb-1"
                      style={{ color: t.accent }}
                    />
                    <p className="text-[8px] text-white/40 uppercase">{l}</p>
                    <p className="text-[10px] text-white font-bold">—</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewFooter({
  email,
  phone,
  website,
}: {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}) {
  const items = [phone, email, website].filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="relative z-10 px-3 py-2 border-t border-white/5">
      <p className="text-[7px] text-white/30 text-center truncate">
        {items.join(" · ")}
      </p>
    </div>
  );
}
