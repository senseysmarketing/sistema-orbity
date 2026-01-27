import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Check, Download, ExternalLink, Loader2, RefreshCw, Unlink } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const GoogleCalendarIntegration = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [importDays, setImportDays] = useState<string>("30");
  const {
    connection,
    isLoading,
    isConnected,
    isSyncEnabled,
    calendars,
    selectedCalendarId,
    isLoadingCalendars,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    toggleSync,
    importEvents,
    selectCalendar,
    refetchCalendars,
  } = useGoogleCalendar();

  // Handle OAuth callback result
  useEffect(() => {
    const googleCalendarStatus = searchParams.get("google_calendar");
    
    if (googleCalendarStatus === "success") {
      toast.success("Google Calendar conectado com sucesso!");
      searchParams.delete("google_calendar");
      setSearchParams(searchParams);
    } else if (googleCalendarStatus === "error") {
      const message = searchParams.get("message");
      toast.error(`Erro ao conectar Google Calendar: ${message || "Erro desconhecido"}`);
      searchParams.delete("google_calendar");
      searchParams.delete("message");
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const getCalendarDisplayName = (calendarId: string) => {
    const calendar = calendars.find(c => c.id === calendarId);
    if (calendar) {
      return calendar.summary;
    }
    return calendarId === "primary" ? "Calendário Principal" : calendarId;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">Google Calendar</CardTitle>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 flex-shrink-0">
                    <Check className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Sincronize suas reuniões com o Google Calendar e gere links do Google Meet automaticamente</span>
                <span className="sm:hidden">Sincronize reuniões e gere links do Meet</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {isConnected ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg bg-muted/30">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-sm font-medium">Conta conectada</p>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{connection?.connected_email}</p>
                {connection?.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Última sincronização: </span>
                    <span className="sm:hidden">Sinc.: </span>
                    {format(new Date(connection.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            {/* Calendar Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-sm font-medium">Calendário</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Selecione qual calendário será usado para criar e importar eventos</span>
                  <span className="sm:hidden">Calendário para sincronização</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedCalendarId}
                  onValueChange={(value) => selectCalendar.mutate(value)}
                  disabled={selectCalendar.isPending || isLoadingCalendars}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
                    {isLoadingCalendars ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs sm:text-sm">Carregando...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder="Selecione" className="text-xs sm:text-sm">
                        <span className="truncate">{getCalendarDisplayName(selectedCalendarId)}</span>
                      </SelectValue>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          {calendar.backgroundColor && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: calendar.backgroundColor }}
                            />
                          )}
                          <span className="truncate">{calendar.summary}</span>
                          {calendar.primary && (
                            <Badge variant="secondary" className="text-xs ml-1 flex-shrink-0">
                              Principal
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetchCalendars()}
                  disabled={isLoadingCalendars}
                  className="h-9 w-9 flex-shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingCalendars ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium">Sincronização automática</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Sincronizar reuniões automaticamente ao criar, editar ou excluir</span>
                  <span className="sm:hidden">Sincronizar automaticamente</span>
                </p>
              </div>
              <Switch
                checked={isSyncEnabled}
                onCheckedChange={(checked) => toggleSync.mutate(checked)}
                disabled={toggleSync.isPending}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border rounded-lg">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-sm font-medium">Importar eventos</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="hidden sm:inline">Importe eventos existentes do calendário selecionado para o Orbity</span>
                  <span className="sm:hidden">Importar do Google Calendar</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={importDays} onValueChange={setImportDays}>
                  <SelectTrigger className="w-[120px] sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => importEvents.mutate(parseInt(importDays))}
                  disabled={importEvents.isPending}
                  className="flex-shrink-0"
                >
                  {importEvents.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Importar</span>
                  <span className="sm:hidden">Imp.</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://calendar.google.com", "_blank")}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Abrir Google Calendar</span>
                <span className="sm:hidden">Abrir</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnectGoogleCalendar.mutate()}
                disabled={disconnectGoogleCalendar.isPending}
                className="w-full sm:w-auto"
              >
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Recursos disponíveis:</p>
              <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <li>• Sincronização automática de reuniões</li>
                <li>• Geração de links do Google Meet</li>
                <li>• Convites automáticos para participantes</li>
                <li className="hidden sm:list-item">• Atualização bidirecional de eventos</li>
                <li className="hidden sm:list-item">• Seleção de calendário específico</li>
              </ul>
            </div>
            
            <Button
              onClick={() => connectGoogleCalendar.mutate()}
              disabled={connectGoogleCalendar.isPending}
              className="w-full"
            >
              {connectGoogleCalendar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              Conectar Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
