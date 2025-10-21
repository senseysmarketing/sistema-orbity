import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useSocialMediaPosts } from "@/hooks/useSocialMediaPosts";
import { PostFormDialog } from "./PostFormDialog";
import { PostCard } from "./PostCard";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SocialMediaCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { posts, loading } = useSocialMediaPosts();

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getPostsForDate = (date: Date) => {
    return posts.filter(post => 
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
          
          {daysInMonth.map(day => {
            const dayPosts = getPostsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card 
                key={day.toISOString()} 
                className={`min-h-[120px] ${isToday ? 'border-primary' : ''}`}
              >
                <CardHeader className="p-2">
                  <CardTitle className="text-sm">{format(day, "d")}</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {dayPosts.slice(0, 3).map(post => (
                    <PostCard key={post.id} post={post} compact />
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

      <PostFormDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
}
