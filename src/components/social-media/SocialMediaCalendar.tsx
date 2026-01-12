import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { PostFormDialog } from "./PostFormDialog";
import { PostCard } from "./PostCard";
import { PostDetailsDialog } from "./PostDetailsDialog";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SocialMediaCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  // Usar allPosts para mostrar arquivados no calendário
  const { allPosts, loading, deletePost, fetchPosts } = useSocialMediaPosts();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekEnd = endOfWeek(selectedDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Usar allPosts para incluir arquivados
  const getPostsForDate = (date: Date) => {
    return allPosts.filter(post => 
      isSameDay(new Date(post.scheduled_date), date)
    );
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const handlePostClick = (post: SocialMediaPost) => {
    setSelectedPost(post);
    setIsDetailsOpen(true);
  };

  const handleEdit = (post: SocialMediaPost) => {
    setEditingPost(post);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    await deletePost(postId);
  };

  const handleDuplicate = (post: SocialMediaPost) => {
    const duplicatedPost = {
      ...post,
      id: '',
      title: `${post.title} (Cópia)`,
      status: 'draft',
      created_at: '',
      created_by: '',
      approval_history: [],
    };
    setEditingPost(duplicatedPost as SocialMediaPost);
    setIsDetailsOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingPost(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
          >
            Mês
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => setViewMode("week")}
          >
            Semana
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            onClick={() => setViewMode("day")}
          >
            Dia
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Postagem
          </Button>
        </div>
      </div>

      {viewMode === "month" && (
        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
            <div key={day} className="text-center font-semibold text-sm p-2">
              {day}
            </div>
          ))}
          
          {calendarDays.map(day => {
            const dayPosts = getPostsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, selectedDate);
            
            return (
              <Card 
                key={day.toISOString()} 
                className={`min-h-[120px] ${isToday ? 'border-primary' : ''} ${!isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <CardHeader className="p-2">
                  <CardTitle className="text-sm">{format(day, "d")}</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {dayPosts.slice(0, 3).map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      compact 
                      showArchived
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{dayPosts.length - 3} mais
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
              <div key={day} className="text-center font-semibold text-sm p-2">
                {day}
              </div>
            ))}
            
            {weekDays.map(day => {
              const dayPosts = getPostsForDate(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <Card 
                  key={day.toISOString()} 
                  className={`min-h-[200px] ${isToday ? 'border-primary border-2' : ''}`}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-lg">{format(day, "d")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {dayPosts.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        compact 
                        showArchived
                        onClick={() => handlePostClick(post)}
                      />
                    ))}
                    {dayPosts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhuma postagem
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "day" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getPostsForDate(selectedDate).length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getPostsForDate(selectedDate).map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      showArchived
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    Nenhuma postagem agendada para este dia
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Postagem
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      <PostFormDialog 
        open={isCreateDialogOpen}
        onOpenChange={handleDialogClose}
        defaultDate={selectedDate}
        editPost={editingPost}
      />

      <PostDetailsDialog
        post={selectedPost}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onPostUpdate={fetchPosts}
      />
    </div>
  );
}
