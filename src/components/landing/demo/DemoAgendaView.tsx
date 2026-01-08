import { Calendar, Clock, Video, Users, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoMeetings } from "@/data/demoData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function DemoAgendaView() {
  const upcomingMeetings = demoMeetings.filter(m => m.status === "agendada");
  const completedMeetings = demoMeetings.filter(m => m.status === "concluida");

  // Generate calendar days
  const today = new Date();
  const calendarDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date;
  });

  const getMeetingsForDate = (date: Date) => {
    return demoMeetings.filter(m => {
      const meetingDate = new Date(m.date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agenda</h2>
          <p className="text-sm text-muted-foreground">{upcomingMeetings.length} reuniões agendadas</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="bg-[#1c102f] hover:bg-[#1c102f]/90 cursor-not-allowed opacity-70" size="sm">
                + Nova Reunião
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Crie sua conta grátis para agendar reuniões</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mini Calendar Week */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex gap-2">
            {calendarDays.map((date, index) => {
              const meetings = getMeetingsForDate(date);
              const isToday = date.toDateString() === today.toDateString();
              
              return (
                <div
                  key={index}
                  className={`flex-1 p-2 rounded-lg text-center transition-colors ${
                    isToday 
                      ? "bg-[#1c102f] text-white" 
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <p className="text-[10px] uppercase">
                    {date.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-bold">{date.getDate()}</p>
                  {meetings.length > 0 && (
                    <div className={`h-1.5 w-1.5 rounded-full mx-auto mt-1 ${
                      isToday ? "bg-white" : "bg-[#1c102f]"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Meetings Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#1c102f]" />
              Próximas Reuniões
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {upcomingMeetings.map((meeting) => (
              <TooltipProvider key={meeting.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2.5 bg-muted/50 rounded-lg cursor-not-allowed hover:bg-muted transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#1c102f]/10 flex items-center justify-center shrink-0">
                          <Video className="h-5 w-5 text-[#1c102f]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-medium truncate">{meeting.title}</h3>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {meeting.client_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(meeting.date).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meeting.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Crie sua conta para gerenciar reuniões</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Reuniões Realizadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {completedMeetings.map((meeting) => (
              <div key={meeting.id} className="p-2.5 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium truncate">{meeting.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{meeting.client_name}</p>
                    <span className="text-[10px] text-green-600">
                      {new Date(meeting.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
