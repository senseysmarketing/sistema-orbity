import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSocialMediaSettings } from "@/hooks/useSocialMediaSettings";
import { useAgency } from "@/hooks/useAgency";
import { Loader2, Info } from "lucide-react";

export function DueDateSettingsManager() {
  const { currentAgency } = useAgency();
  const { settings, loading, updateSettings, getDefaultDueDateDaysBefore } = useSocialMediaSettings(currentAgency?.id);
  const [daysBefore, setDaysBefore] = useState<number>(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDaysBefore(getDefaultDueDateDaysBefore());
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ default_due_date_days_before: daysBefore });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prazo de Entrega de Arte</CardTitle>
        <CardDescription>
          Configure quantos dias antes da postagem a arte deve estar pronta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="days-before">Dias de Antecedência para Entrega</Label>
          <div className="flex items-center gap-3">
            <Select 
              value={String(daysBefore)} 
              onValueChange={(value) => setDaysBefore(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="2">2 dias</SelectItem>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="4">4 dias</SelectItem>
                <SelectItem value="5">5 dias</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="10">10 dias</SelectItem>
                <SelectItem value="14">14 dias</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">antes da data de postagem</span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Este valor será usado como padrão ao criar novas postagens. 
            A data limite da arte será calculada automaticamente subtraindo 
            este número de dias da data de publicação.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
