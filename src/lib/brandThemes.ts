/**
 * Brand themes — White-Label engine
 * Single source of truth used by Settings preview, PublicApproval and PublicClientReport.
 *
 * IMPORTANT: themes use raw hex/rgba inside arbitrary Tailwind classes (bg-[...])
 * because the public pages must be self-contained and not depend on the agency dark theme tokens.
 */

export type BrandThemeKey =
  | "obsidian"
  | "midnight"
  | "amethyst"
  | "forest"
  | "graphite";

export interface BrandTheme {
  key: BrandThemeKey;
  label: string;
  description: string;
  /** Solid background class for the main wrapper */
  bgClass: string;
  /** Inline radial overlay style for cinematic depth */
  overlayStyle: React.CSSProperties;
  /** Hex used in the settings card swatch */
  swatch: string;
  /** Accent color (used by ping dots / chips) */
  accent: string;
}

export const BRAND_THEMES: Record<BrandThemeKey, BrandTheme> = {
  obsidian: {
    key: "obsidian",
    label: "Obsidian",
    description: "Preto puro com brilhos sutis em azul e violeta",
    bgClass: "bg-[#0a0a1a]",
    overlayStyle: {
      background:
        "radial-gradient(ellipse at top, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(139,92,246,0.05) 0%, transparent 50%)",
    },
    swatch: "#0a0a1a",
    accent: "#3b82f6",
  },
  midnight: {
    key: "midnight",
    label: "Midnight",
    description: "Azul profundo, ideal para marcas corporativas",
    bgClass: "bg-[#020617]",
    overlayStyle: {
      background:
        "radial-gradient(ellipse at top, rgba(56,189,248,0.10) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(14,165,233,0.06) 0%, transparent 50%)",
    },
    swatch: "#020617",
    accent: "#38bdf8",
  },
  amethyst: {
    key: "amethyst",
    label: "Amethyst",
    description: "Roxo escuro elegante para marcas premium",
    bgClass: "bg-[#1a0b2e]",
    overlayStyle: {
      background:
        "radial-gradient(ellipse at top, rgba(168,85,247,0.12) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(217,70,239,0.06) 0%, transparent 50%)",
    },
    swatch: "#1a0b2e",
    accent: "#a855f7",
  },
  forest: {
    key: "forest",
    label: "Forest",
    description: "Verde musgo profundo, orgânico e refinado",
    bgClass: "bg-[#0a1a14]",
    overlayStyle: {
      background:
        "radial-gradient(ellipse at top, rgba(16,185,129,0.10) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(5,150,105,0.06) 0%, transparent 50%)",
    },
    swatch: "#0a1a14",
    accent: "#10b981",
  },
  graphite: {
    key: "graphite",
    label: "Graphite",
    description: "Cinza grafite neutro e atemporal",
    bgClass: "bg-[#111113]",
    overlayStyle: {
      background:
        "radial-gradient(ellipse at top, rgba(244,244,245,0.06) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(161,161,170,0.04) 0%, transparent 50%)",
    },
    swatch: "#111113",
    accent: "#a1a1aa",
  },
};

export const BRAND_THEME_LIST = Object.values(BRAND_THEMES);

export function resolveBrandTheme(key?: string | null): BrandTheme {
  if (key && key in BRAND_THEMES) {
    return BRAND_THEMES[key as BrandThemeKey];
  }
  return BRAND_THEMES.obsidian;
}
