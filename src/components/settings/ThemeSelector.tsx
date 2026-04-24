import { Check } from "lucide-react";
import { BRAND_THEME_LIST, type BrandThemeKey } from "@/lib/brandThemes";

interface ThemeSelectorProps {
  value: BrandThemeKey;
  onChange: (key: BrandThemeKey) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {BRAND_THEME_LIST.map((theme) => {
        const selected = theme.key === value;
        return (
          <button
            key={theme.key}
            type="button"
            onClick={() => onChange(theme.key)}
            className={`group relative rounded-xl border p-3 text-left transition-all ${
              selected
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/40"
            }`}
          >
            <div
              className="h-16 w-full rounded-lg relative overflow-hidden"
              style={{ backgroundColor: theme.swatch }}
            >
              <div
                className="absolute inset-0"
                style={theme.overlayStyle}
                aria-hidden
              />
              {selected && (
                <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium">{theme.label}</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {theme.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
