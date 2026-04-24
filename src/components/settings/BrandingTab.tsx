import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Sparkles } from "lucide-react";
import { useAgency } from "@/hooks/useAgency";
import { useUpdateAgencyBranding } from "@/hooks/useUpdateAgencyBranding";
import { LogoUploader } from "./LogoUploader";
import { ThemeSelector } from "./ThemeSelector";
import { BrandingPreview } from "./BrandingPreview";
import { type BrandThemeKey } from "@/lib/brandThemes";
import { supabase } from "@/integrations/supabase/client";

export function BrandingTab() {
  const { currentAgency, refreshAgencies } = useAgency();
  const { update, saving } = useUpdateAgencyBranding();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<BrandThemeKey>("obsidian");
  const [publicEmail, setPublicEmail] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Load extra branding fields not present in useAgency type
  useEffect(() => {
    if (!currentAgency?.id) return;
    setLogoUrl(currentAgency.logo_url ?? null);
    (async () => {
      const { data } = await supabase
        .from("agencies")
        .select("brand_theme, public_email, public_phone, website_url")
        .eq("id", currentAgency.id)
        .maybeSingle();
      if (data) {
        setTheme((data.brand_theme as BrandThemeKey) ?? "obsidian");
        setPublicEmail(data.public_email ?? "");
        setPublicPhone(data.public_phone ?? "");
        setWebsiteUrl(data.website_url ?? "");
      }
    })();
  }, [currentAgency?.id, currentAgency?.logo_url]);

  const handleLogoChange = async (url: string | null) => {
    setLogoUrl(url);
    // Persist immediately so it shows up everywhere
    if (currentAgency?.id) {
      await supabase.from("agencies").update({ logo_url: url }).eq("id", currentAgency.id);
      await refreshAgencies();
    }
  };

  const handleSave = async () => {
    await update({
      brand_theme: theme,
      public_email: publicEmail.trim() || null,
      public_phone: publicPhone.trim() || null,
      website_url: websiteUrl.trim() || null,
    });
  };

  if (!currentAgency) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhuma agência selecionada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          Branding & Agência
        </h3>
        <p className="text-muted-foreground">
          Personalize a identidade visual exibida nos links públicos da sua agência
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Identidade da agência</CardTitle>
            <CardDescription>
              Logo, contatos públicos e tema visual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Logo</Label>
              <LogoUploader
                agencyId={currentAgency.id}
                currentLogoUrl={logoUrl}
                onUploaded={handleLogoChange}
              />
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="public_email">Email público</Label>
                <Input
                  id="public_email"
                  type="email"
                  placeholder="contato@suaagencia.com"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="public_phone">Telefone / WhatsApp público</Label>
                <Input
                  id="public_phone"
                  placeholder="(11) 99999-9999"
                  value={publicPhone}
                  onChange={(e) => setPublicPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://suaagencia.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Tema dos links públicos</Label>
              <ThemeSelector value={theme} onChange={setTheme} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar branding"}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT — Live Preview */}
        <Card className="lg:sticky lg:top-4 self-start">
          <CardHeader>
            <CardTitle>Como seus clientes verão</CardTitle>
            <CardDescription>
              Atualiza em tempo real conforme você edita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandingPreview
              theme={theme}
              logoUrl={logoUrl}
              agencyName={currentAgency.name}
              publicEmail={publicEmail}
              publicPhone={publicPhone}
              websiteUrl={websiteUrl}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
