import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star } from "lucide-react";

interface Lead {
  id: string;
  source: string;
  value: number;
  email: string | null;
  phone: string | null;
  company: string | null;
  last_contact: string | null;
  next_contact: string | null;
  created_at: string;
  temperature: string;
}

interface LeadScoringProps {
  lead: Lead;
  showLabel?: boolean;
}

export function LeadScoring({ lead, showLabel = true }: LeadScoringProps) {
  const score = useMemo(() => {
    let points = 0;
    
    // Fonte (Meta Ads = mais pontos)
    if (lead.source === 'facebook_leads') points += 20;
    else if (lead.source === 'website') points += 15;
    else if (lead.source === 'referral') points += 15;
    else points += 10;
    
    // Valor
    if (lead.value > 10000) points += 30;
    else if (lead.value > 5000) points += 20;
    else if (lead.value > 1000) points += 10;
    
    // Engajamento
    if (lead.last_contact) points += 15;
    if (lead.next_contact) points += 10;
    
    // Dados completos
    if (lead.email && lead.phone && lead.company) points += 15;
    else if ((lead.email && lead.phone) || (lead.email && lead.company)) points += 10;
    else if (lead.email || lead.phone) points += 5;
    
    // Tempo no funil (mais recente = melhor)
    const daysInFunnel = Math.floor(
      (new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysInFunnel < 7) points += 10;
    else if (daysInFunnel < 30) points += 5;
    
    // Temperatura
    if (lead.temperature === 'hot') points += 10;
    else if (lead.temperature === 'warm') points += 5;
    
    return Math.min(points, 100);
  }, [lead]);

  const getScoreBadgeVariant = () => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'outline';
  };

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityLabel = () => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Baixo';
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {showLabel && <span className="text-xs text-muted-foreground whitespace-nowrap">Score:</span>}
      <Progress value={score} className="h-2 flex-1" />
      <Badge variant={getScoreBadgeVariant()} className={`text-xs ${getScoreColor()}`}>
        <Star className="h-3 w-3 mr-1" />
        {score}%
      </Badge>
      {showLabel && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{getQualityLabel()}</span>
      )}
    </div>
  );
}
