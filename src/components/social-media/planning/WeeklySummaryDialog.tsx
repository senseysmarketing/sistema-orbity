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

const FORMAT_EMOJI: Record<string, string> = {
  carrossel: "🎠",
  reels: "🎬",
  feed: "📸",
  stories: "📱",
  video: "🎥",
};

function getFormatEmoji(format?: string | null): string {
  if (!format) return "📌";
  const key = format.toLowerCase().trim();
  return FORMAT_EMOJI[key] || "📌";
}

function getDayAbbr(date: Date): string {
  const name = format(date, "EEE", { locale: ptBR });
  return name.charAt(0).toUpperCase() + name.slice(1);
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

  let text = `Olá! Segue o planejamento de conteúdo da semana para *${clientName}* 📱\n`;

  sortedWeeks.forEach(([, week], idx) => {
    const startStr = format(week.start, "dd/MM", { locale: ptBR });
    const endStr = format(week.end, "dd/MM", { locale: ptBR });
    const count = week.items.length;

    text += `\n*Semana ${idx + 1} (${startStr} a ${endStr}) – ${count} post${count !== 1 ? "s" : ""}*\n\n`;

    week.items.forEach((item) => {
      const date = new Date(item.post_date! + "T12:00:00");
      const dayAbbr = getDayAbbr(date);
      const dayFormatted = format(date, "dd/MM", { locale: ptBR });
      const emoji = getFormatEmoji(item.format);

      text += `📅 ${dayAbbr} ${dayFormatted} — ${emoji} ${item.title}\n`;
    });
  });

  if (withoutDate.length > 0) {
    text += `\n*Sem data definida – ${withoutDate.length} post${withoutDate.length !== 1 ? "s" : ""}*\n\n`;
    withoutDate.forEach((item) => {
      const emoji = getFormatEmoji(item.format);
      text += `📌 ${emoji} ${item.title}\n`;
    });
  }

  text += `\nQualquer ajuste é só me chamar! ✅`;

  return text;
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
