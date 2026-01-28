import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { UserMetrics, PostWithAssignments, ProfileData } from "./types";

interface TeamPerformanceTableProps {
  posts: PostWithAssignments[];
  profiles: ProfileData[];
  teamSize: number;
}

export function TeamPerformanceTable({ posts, profiles, teamSize }: TeamPerformanceTableProps) {
  const userMetrics = useMemo(() => {
    const metricsMap = new Map<string, UserMetrics>();

    // Initialize all users
    profiles.forEach(profile => {
      metricsMap.set(profile.user_id, {
        userId: profile.user_id,
        name: profile.name || 'Usuário',
        avatarUrl: profile.avatar_url,
        postsAssigned: 0,
        postsPublished: 0,
        postsInProgress: 0,
        postsPendingApproval: 0,
        completionRate: 0,
        avgTimeToPublish: 0,
      });
    });

    // Calculate metrics per user
    const publishTimes: Map<string, number[]> = new Map();

    posts.forEach(post => {
      if (!post.post_assignments || post.archived) return;

      post.post_assignments.forEach(assignment => {
        const userId = assignment.user_id;
        const metrics = metricsMap.get(userId);
        if (!metrics) return;

        metrics.postsAssigned++;

        if (post.status === 'published') {
          metrics.postsPublished++;
          
          // Calculate time to publish
          if (post.post_date && post.created_at) {
            const created = new Date(post.created_at);
            const published = new Date(post.post_date);
            const days = (published.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            if (days >= 0 && days <= 365) { // Sanity check
              const times = publishTimes.get(userId) || [];
              times.push(days);
              publishTimes.set(userId, times);
            }
          }
        } else if (post.status === 'in_creation') {
          metrics.postsInProgress++;
        } else if (post.status === 'pending_approval') {
          metrics.postsPendingApproval++;
        }

        metricsMap.set(userId, metrics);
      });
    });

    // Calculate completion rates and avg times
    metricsMap.forEach((metrics, userId) => {
      if (metrics.postsAssigned > 0) {
        metrics.completionRate = Math.round((metrics.postsPublished / metrics.postsAssigned) * 100);
      }

      const times = publishTimes.get(userId);
      if (times && times.length > 0) {
        metrics.avgTimeToPublish = Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
      }
    });

    // Sort by completion rate descending, then by posts assigned
    return Array.from(metricsMap.values())
      .filter(m => m.postsAssigned > 0)
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate) {
          return b.completionRate - a.completionRate;
        }
        return b.postsAssigned - a.postsAssigned;
      });
  }, [posts, profiles]);

  const avgCompletionRate = useMemo(() => {
    if (userMetrics.length === 0) return 0;
    return Math.round(userMetrics.reduce((sum, m) => sum + m.completionRate, 0) / userMetrics.length);
  }, [userMetrics]);

  const avgPostsPerUser = useMemo(() => {
    if (teamSize === 0) return 0;
    const totalAssigned = userMetrics.reduce((sum, m) => sum + m.postsAssigned, 0);
    return Math.round((totalAssigned / teamSize) * 10) / 10;
  }, [userMetrics, teamSize]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCompletionBadge = (rate: number, index: number) => {
    if (index === 0 && rate >= 70) {
      return (
        <Badge className="bg-yellow-500 text-black flex items-center gap-1">
          <Trophy className="h-3 w-3" />
          {rate}%
        </Badge>
      );
    }
    if (rate >= 80) {
      return <Badge className="bg-green-500">{rate}%</Badge>;
    }
    if (rate >= 60) {
      return <Badge className="bg-yellow-500 text-black">{rate}%</Badge>;
    }
    return <Badge variant="destructive">{rate}%</Badge>;
  };

  const getTrendIcon = (rate: number) => {
    if (rate >= avgCompletionRate + 10) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (rate <= avgCompletionRate - 10) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (userMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance da Equipe
          </CardTitle>
          <CardDescription>
            Nenhum usuário com posts atribuídos neste período
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance da Equipe
            </CardTitle>
            <CardDescription>
              Ranking de produtividade por membro da equipe
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Média: {avgCompletionRate}% conclusão</span>
            <span>~{avgPostsPerUser} posts/usuário</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Usuário</TableHead>
                <TableHead className="text-center">Atribuídos</TableHead>
                <TableHead className="text-center">Publicados</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Em Criação</TableHead>
                <TableHead className="text-center hidden md:table-cell">Aguardando</TableHead>
                <TableHead className="text-center">Taxa</TableHead>
                <TableHead className="text-center hidden lg:table-cell">Tempo Médio</TableHead>
                <TableHead className="w-[120px] hidden md:table-cell">Carga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userMetrics.map((user, index) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate max-w-[120px]">
                          {user.name}
                        </span>
                        {getTrendIcon(user.completionRate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {user.postsAssigned}
                  </TableCell>
                  <TableCell className="text-center text-green-600 font-medium">
                    {user.postsPublished}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {user.postsInProgress}
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    {user.postsPendingApproval}
                  </TableCell>
                  <TableCell className="text-center">
                    {getCompletionBadge(user.completionRate, index)}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground hidden lg:table-cell">
                    {user.avgTimeToPublish > 0 ? `${user.avgTimeToPublish}d` : '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Progress 
                      value={Math.min((user.postsAssigned / (avgPostsPerUser * 2)) * 100, 100)} 
                      className="h-2"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
