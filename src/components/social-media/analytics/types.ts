export interface UserMetrics {
  userId: string;
  name: string;
  avatarUrl: string | null;
  postsAssigned: number;
  postsPublished: number;
  postsInProgress: number;
  postsPendingApproval: number;
  completionRate: number;
  avgTimeToPublish: number; // em dias
}

export interface ClientMetrics {
  clientId: string;
  name: string;
  totalPosts: number;
  publishedPosts: number;
  upcomingPosts: number;
  overduePosts: number;
  nextScheduledDate: Date | null;
  completionRate: number;
  platforms: string[];
}

export interface SmartInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  category: string;
  icon: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface PostWithAssignments {
  id: string;
  title: string;
  status: string;
  priority: string;
  platform: string;
  post_type: string;
  client_id: string | null;
  scheduled_date: string;
  post_date: string | null;
  created_at: string;
  archived?: boolean;
  clients?: { name: string } | null;
  post_assignments?: { user_id: string }[];
}

export interface ProfileData {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

export interface StatusDistribution {
  draft: number;
  in_creation: number;
  pending_approval: number;
  approved: number;
  published: number;
}
