import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Plus, Calendar, Instagram, Facebook, Linkedin, Twitter, Youtube } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ClientPostsProps {
  clientId: string;
  clientName: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500",
  pending_approval: "bg-amber-500",
  approved: "bg-green-500",
  scheduled: "bg-blue-500",
  published: "bg-purple-500",
  rejected: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando Aprovação",
  approved: "Aprovado",
  scheduled: "Agendado",
  published: "Publicado",
  rejected: "Rejeitado",
};

const PLATFORM_ICONS: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Image,
};

export function ClientPosts({ clientId, clientName }: ClientPostsProps) {
  const navigate = useNavigate();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["client-posts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_posts")
        .select("*")
        .eq("client_id", clientId)
        .eq("archived", false)
        .order("scheduled_date", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const scheduledPosts = posts?.filter((p) => p.status === "approved" || p.status === "scheduled") || [];
  const publishedPosts = posts?.filter((p) => p.status === "published") || [];
  const pendingPosts = posts?.filter((p) => p.status === "draft" || p.status === "pending_approval") || [];

  const getPlatformIcon = (platform: string) => {
    const Icon = PLATFORM_ICONS[platform.toLowerCase()] || Image;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scheduledPosts.length}</p>
              <p className="text-sm text-muted-foreground">Agendados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Image className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{publishedPosts.length}</p>
              <p className="text-sm text-muted-foreground">Publicados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Image className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingPosts.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Posts List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Posts Recentes</CardTitle>
          <Button size="sm" onClick={() => navigate("/social-media")}>
            <Plus className="h-4 w-4 mr-2" />
            Ver Todos
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
              ))}
            </div>
          ) : !posts?.length ? (
            <div className="text-center py-8">
              <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum post vinculado a este cliente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.slice(0, 10).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[post.status] || "bg-gray-400"}`} />
                    <div>
                      <p className="font-medium line-clamp-1">{post.title || "Sem título"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {STATUS_LABELS[post.status] || post.status}
                        </Badge>
                        {post.platform && (
                          <span className="flex items-center gap-1">
                            {getPlatformIcon(post.platform)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {post.scheduled_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(post.scheduled_date), "dd/MM", { locale: ptBR })}
                    </span>
                  )}
                </div>
              ))}
              {posts.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  + {posts.length - 10} posts
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
