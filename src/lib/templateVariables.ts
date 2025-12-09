import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TemplateContext {
  clientName?: string;
  userName?: string;
}

export function replaceTemplateVariables(text: string | null, context?: TemplateContext): string {
  if (!text) return "";

  const now = new Date();
  
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return text
    .replace(/{data}/g, format(now, "dd/MM/yyyy"))
    .replace(/{mes}/g, months[now.getMonth()])
    .replace(/{ano}/g, now.getFullYear().toString())
    .replace(/{dia}/g, now.getDate().toString().padStart(2, "0"))
    .replace(/{dia_semana}/g, format(now, "EEEE", { locale: ptBR }))
    .replace(/{cliente}/g, context?.clientName || "[Cliente]")
    .replace(/{usuario}/g, context?.userName || "[Usuário]");
}

export function calculateDueDate(offsetDays: number | null): string {
  if (!offsetDays) return "";
  
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + offsetDays);
  
  return dueDate.toISOString().split("T")[0];
}
