import { SocialMediaTask } from '@/hooks/useSocialMediaTasks';

export interface DayData {
  posts: SocialMediaTask[];
  ready: number;      // approved + published
  inProgress: number; // in_creation + pending_approval
  draft: number;      // draft/briefing
}

export interface AssignedUserSummary {
  userId: string;
  name: string;
  count: number;
}

export interface ClientWeekPlan {
  clientId: string;
  clientName: string;
  days: Record<string, DayData>;
  weekTotal: number;
  readyCount: number;
  readinessPercentage: number;
  hasOverdue: boolean;
  // Enriched fields
  platforms: string[];
  contentTypes: string[];
  assignedUsers: AssignedUserSummary[];
  nearestDueDate: Date | null;
  hasUrgentDeadline: boolean;
}

export type ReadinessFilter = 'all' | 'ready' | 'in_progress' | 'pending' | 'overdue';

export const STATUS_CATEGORIES = {
  ready: ['approved', 'published', 'aprovado', 'publicado', 'completed', 'done'],
  inProgress: ['in_creation', 'pending_approval', 'em_criacao', 'aguardando_aprovacao', 'revisao', 'in_progress', 'review', 'revision'],
  draft: ['draft', 'briefing', 'rascunho', 'todo', 'pending'],
} as const;

export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  draft: 'Briefing',
  briefing: 'Briefing',
  in_creation: 'Em Criação',
  pending_approval: 'Aguardando Aprovação',
  approved: 'Aprovado',
  published: 'Publicado',
  revision: 'Em Revisão',
  rascunho: 'Briefing',
  em_criacao: 'Em Criação',
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  revisao: 'Em Revisão',
  // Task statuses
  todo: 'Briefing',
  pending: 'Briefing',
  in_progress: 'Em Criação',
  review: 'Aguardando Aprovação',
  completed: 'Publicado',
  done: 'Publicado',
};

export function translateStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_DISPLAY_LABELS[normalized] || status;
}

export function categorizeStatus(status: string): 'ready' | 'inProgress' | 'draft' {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  if (STATUS_CATEGORIES.ready.some(s => normalized.includes(s))) return 'ready';
  if (STATUS_CATEGORIES.inProgress.some(s => normalized.includes(s))) return 'inProgress';
  return 'draft';
}
