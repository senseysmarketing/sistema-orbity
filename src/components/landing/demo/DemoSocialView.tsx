import { Instagram, Facebook, Linkedin, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoPosts } from "@/data/demoData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "instagram":
      return <Instagram className="h-4 w-4 text-pink-500" />;
    case "facebook":
      return <Facebook className="h-4 w-4 text-blue-600" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4 text-blue-700" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    publicado: "bg-green-500 text-white",
    agendado: "bg-blue-500 text-white",
    aprovacao: "bg-amber-500 text-white",
    rascunho: "bg-gray-500 text-white",
  };
  const labels: Record<string, string> = {
    publicado: "Publicado",
    agendado: "Agendado",
    aprovacao: "Aprovação",
    rascunho: "Rascunho",
  };
  return (
    <Badge className={`text-[10px] ${styles[status]}`}>
      {labels[status]}
    </Badge>
  );
};

export function DemoSocialView() {
  const groupedPosts = {
    publicado: demoPosts.filter(p => p.status === "publicado"),
    agendado: demoPosts.filter(p => p.status === "agendado"),
    aprovacao: demoPosts.filter(p => p.status === "aprovacao"),
    rascunho: demoPosts.filter(p => p.status === "rascunho"),
  };

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Social Media</h2>
          <p className="text-sm text-muted-foreground">{demoPosts.length} posts no calendário</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="bg-[#1c102f] hover:bg-[#1c102f]/90 cursor-not-allowed opacity-70" size="sm">
                + Novo Post
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Crie sua conta grátis para criar posts</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-xl font-bold text-green-600">{groupedPosts.publicado.length}</p>
            <p className="text-[10px] text-muted-foreground">Publicados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-xl font-bold text-blue-600">{groupedPosts.agendado.length}</p>
            <p className="text-[10px] text-muted-foreground">Agendados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-xl font-bold text-amber-600">{groupedPosts.aprovacao.length}</p>
            <p className="text-[10px] text-muted-foreground">Aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <p className="text-xl font-bold text-gray-600">{groupedPosts.rascunho.length}</p>
            <p className="text-[10px] text-muted-foreground">Rascunhos</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {demoPosts.map((post) => (
          <TooltipProvider key={post.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-not-allowed hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Placeholder Image */}
                      <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-[#1c102f]/20 to-purple-500/20 flex items-center justify-center shrink-0">
                        {getPlatformIcon(post.platform)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            {getPlatformIcon(post.platform)}
                            <span className="text-xs font-medium capitalize">{post.platform}</span>
                          </div>
                          {getStatusBadge(post.status)}
                        </div>
                        
                        <h3 className="text-sm font-medium truncate">{post.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{post.client_name}</p>
                        
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(post.scheduled_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>Crie sua conta para editar este post</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}
