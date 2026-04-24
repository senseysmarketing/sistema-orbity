// Centralized mapping of Meta Ads campaign objectives -> result action types
// Provides resilient resolution: label is derived from objective FIRST,
// then the value is looked up in the campaign actions array.

export interface ActionData {
  action_type: string;
  value: string | number;
}

export interface CampaignLike {
  objective?: string;
  actions?: ActionData[];
  conversions?: number;
  spend?: number;
}

export interface ObjectiveResult {
  value: number;
  label: string;
  actionType: string;
  objective: string;
}

interface ObjectiveDefinition {
  label: string;
  actionType: string;
  // Fallback action types (in order) if primary not present
  fallbackActionTypes?: string[];
}

// Primary mapping: Meta objective -> expected action_type + label
export const OBJECTIVE_MAP: Record<string, ObjectiveDefinition> = {
  OUTCOME_LEADS: {
    label: 'Leads',
    actionType: 'lead',
    fallbackActionTypes: ['onsite_conversion.lead_grouped', 'leadgen.other'],
  },
  LEAD_GENERATION: {
    label: 'Leads',
    actionType: 'lead',
    fallbackActionTypes: ['onsite_conversion.lead_grouped'],
  },
  OUTCOME_SALES: {
    label: 'Compras',
    actionType: 'purchase',
    fallbackActionTypes: ['offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
  },
  CONVERSIONS: {
    label: 'Conversões',
    actionType: 'offsite_conversion.fb_pixel_purchase',
    fallbackActionTypes: ['purchase', 'lead'],
  },
  OUTCOME_TRAFFIC: {
    label: 'Cliques no Link',
    actionType: 'link_click',
    fallbackActionTypes: ['landing_page_view'],
  },
  LINK_CLICKS: {
    label: 'Cliques no Link',
    actionType: 'link_click',
    fallbackActionTypes: ['landing_page_view'],
  },
  OUTCOME_ENGAGEMENT: {
    label: 'Mensagens',
    actionType: 'onsite_conversion.messaging_conversation_started_7d',
    fallbackActionTypes: ['onsite_conversion.messaging_first_reply', 'post_engagement', 'page_engagement'],
  },
  MESSAGES: {
    label: 'Mensagens',
    actionType: 'onsite_conversion.messaging_conversation_started_7d',
    fallbackActionTypes: ['onsite_conversion.messaging_first_reply'],
  },
  OUTCOME_AWARENESS: {
    label: 'Alcance',
    actionType: 'reach',
    fallbackActionTypes: ['impressions'],
  },
  REACH: {
    label: 'Alcance',
    actionType: 'reach',
  },
  BRAND_AWARENESS: {
    label: 'Reconhecimento',
    actionType: 'reach',
  },
  OUTCOME_APP_PROMOTION: {
    label: 'Instalações',
    actionType: 'omni_app_install',
    fallbackActionTypes: ['app_install', 'mobile_app_install'],
  },
  APP_INSTALLS: {
    label: 'Instalações',
    actionType: 'omni_app_install',
    fallbackActionTypes: ['app_install'],
  },
  VIDEO_VIEWS: {
    label: 'Visualizações de Vídeo',
    actionType: 'video_view',
  },
  POST_ENGAGEMENT: {
    label: 'Engajamento',
    actionType: 'post_engagement',
    fallbackActionTypes: ['page_engagement'],
  },
};

const DEFAULT_DEFINITION: ObjectiveDefinition = {
  label: 'Resultados',
  actionType: 'lead',
};

/**
 * Resolves the result for a single campaign based on its objective.
 * Always returns a valid label (even when value is 0).
 */
export function getObjectiveResult(campaign: CampaignLike): ObjectiveResult {
  const objective = campaign.objective || 'UNKNOWN';
  const def = OBJECTIVE_MAP[objective] || DEFAULT_DEFINITION;

  let value = 0;
  if (campaign.actions && campaign.actions.length > 0) {
    // Try primary action type first
    const primary = campaign.actions.find(a => a.action_type === def.actionType);
    if (primary) {
      value = parseInt(String(primary.value)) || 0;
    } else if (def.fallbackActionTypes) {
      // Try fallback action types
      for (const fallback of def.fallbackActionTypes) {
        const match = campaign.actions.find(a => a.action_type === fallback);
        if (match) {
          value = parseInt(String(match.value)) || 0;
          break;
        }
      }
    }
  }

  // If still 0 and we have campaign.conversions as last resort fallback
  // (only when objective is unknown, we trust the generic conversions field)
  if (value === 0 && !OBJECTIVE_MAP[objective] && campaign.conversions) {
    value = campaign.conversions;
  }

  return {
    value,
    label: def.label,
    actionType: def.actionType,
    objective,
  };
}

/**
 * Cost per result. Returns null if the result count is zero (avoids Infinity/NaN).
 */
export function getCostPerResult(campaign: CampaignLike): number | null {
  const result = getObjectiveResult(campaign);
  if (!result.value || result.value <= 0) return null;
  const spend = campaign.spend || 0;
  if (spend <= 0) return null;
  return spend / result.value;
}

export interface ResultByObjective {
  label: string;
  actionType: string;
  total: number;
  spend: number;
  costPerResult: number | null;
  campaignCount: number;
}

/**
 * Groups campaigns by their objective label and aggregates results + spend.
 */
export function groupResultsByObjective(campaigns: CampaignLike[]): ResultByObjective[] {
  const groups = new Map<string, ResultByObjective>();

  for (const c of campaigns) {
    const result = getObjectiveResult(c);
    const key = result.label;
    const existing = groups.get(key);
    if (existing) {
      existing.total += result.value;
      existing.spend += c.spend || 0;
      existing.campaignCount += 1;
    } else {
      groups.set(key, {
        label: result.label,
        actionType: result.actionType,
        total: result.value,
        spend: c.spend || 0,
        costPerResult: null,
        campaignCount: 1,
      });
    }
  }

  // Compute cost per result per group
  const arr = Array.from(groups.values()).map(g => ({
    ...g,
    costPerResult: g.total > 0 && g.spend > 0 ? g.spend / g.total : null,
  }));

  // Sort by total result desc
  return arr.sort((a, b) => b.total - a.total);
}

/**
 * Format helper for currency with Infinity/NaN guard.
 */
export function formatCostPerResult(value: number | null): string {
  if (value === null || !isFinite(value) || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
