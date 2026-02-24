import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check } from "lucide-react";
import { ContentPlan } from "@/hooks/useContentPlanning";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WeeklySummaryDialogProps {
  plan: ContentPlan | null;
  open: boolean;
  onClose: () => void;
}

function generateSummaryText(plan: ContentPlan): string {
  const items = plan.content_plan_items || [];
  const clientName = plan.clients?.name || "Cliente";

  const withDate = items.filter((i) => i.post_date).sort((a, b) => a.post_date!.localeCompare(b.post_date!));
  const withoutDate = items.filter((i) => !i.post_date);

  // Group by week (monday-sunday)
  const weeks = new Map<string, { start: Date; end: Date; items: typeof withDate }>();

  for (const item of withDate) {
    const date = new Date(item.post_date! + "T12:00:00");
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    const key = weekStart.toISOString();

    if (!weeks.has(key)) {
      weeks.set(key, { start: weekStart, end: weekEnd, items: [] });
    }
    weeks.get(key)!.items.push(item);
  }

  const sortedWeeks = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));

  let text = `Bom dia! Aproveitando o início da semana, abaixo segue os conteúdos que vamos produzir para as redes sociais de ${clientName}! Qualquer alteração ou sugestão de conteúdo pode me acionar! 🌤️\n`;

  sortedWeeks.forEach(([, week], idx) => {
    const startStr = format(week.start, "dd/MM", { locale: ptBR });
    const endStr = format(week.end, "dd/MM", { locale: ptBR });
    const count = week.items.length;
    const plural = count === 1 ? "Conteúdo" : "Conteúdos";

    text += `\n--- Semana ${idx + 1} (${startStr} a ${endStr}) – ${count} ${plural} ---\n\n`;

    week.items.forEach((item, i) => {
      const date = new Date(item.post_date! + "T12:00:00");
      const dayName = format(date, "EEEE", { locale: ptBR });
      const dayFormatted = format(date, "dd/MM", { locale: ptBR });
      const capitalDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      text += `${i + 1}. ${item.title} [${capitalDay}, ${dayFormatted}]\n`;
      if (item.description) {
        text += `   🎯 Tema: ${item.description}\n`;
      }
      const parts: string[] = [];
      if (item.format) parts.push(`🎥 Formato: ${item.format}`);
      if (item.platform) parts.push(`📱 Plataforma: ${item.platform}`);
      if (parts.length > 0) {
        text += `   ${parts.join(" | ")}\n`;
      }
      text += "\n";
    });
  });

  if (withoutDate.length > 0) {
    text += `\n--- Sem data definida – ${withoutDate.length} Conteúdo${withoutDate.length > 1 ? "s" : ""} ---\n\n`;
    withoutDate.forEach((item, i) => {
      text += `${i + 1}. ${item.title}\n`;
      if (item.description) text += `   🎯 Tema: ${item.description}\n`;
      const parts: string[] = [];
      if (item.format) parts.push(`🎥 Formato: ${item.format}`);
      if (item.platform) parts.push(`📱 Plataforma: ${item.platform}`);
      if (parts.length > 0) text += `   ${parts.join(" | ")}\n`;
      text += "\n";
    });
  }

  return text.trimEnd();
}

export function WeeklySummaryDialog({ plan, open, onClose }: WeeklySummaryDialogProps) {
  const [copied, setCopied] = useState(false);
  const summaryText = plan ? generateSummaryText(plan) : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Resumo Semanal</DialogTitle>
          <DialogDescription>
            Mensagem pronta para enviar ao cliente com o planejamento organizado por semana.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          readOnly
          value={summaryText}
          className="flex-1 min-h-[300px] text-sm font-mono resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar mensagem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
