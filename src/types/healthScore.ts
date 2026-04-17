export interface HealthScoreRules {
  meeting_frequency_days: number;
  max_overdue_tasks: number;
  min_nps_score: number;
}

export const DEFAULT_HEALTH_RULES: HealthScoreRules = {
  meeting_frequency_days: 30,
  max_overdue_tasks: 0,
  min_nps_score: 8,
};

export interface HealthScoreBreakdown {
  meetings: number;
  deliveries: number;
  satisfaction: number;
}

export interface HealthScoreResult {
  score: number;
  breakdown: HealthScoreBreakdown;
  rules: HealthScoreRules;
}
