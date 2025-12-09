import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Check, Download, ExternalLink, Loader2, Unlink } from "lucide-react";
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
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    toggleSync,
    importEvents,
  } = useGoogleCalendar();

  // Handle OAuth callback result
  useEffect(() => {
    const googleCalendarStatus = searchParams.get("google_calendar");
    
    if (googleCalendarStatus === "success") {
      toast.success("Google Calendar conectado com sucesso!");
      // Clean up URL params
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
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Google Calendar</CardTitle>
            <CardDescription>
              Sincronize suas reuniões com o Google Calendar e gere links do Google Meet automaticamente
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              <Check className="mr-1 h-3 w-3" />
              Conectado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="text-sm font-medium">Conta conectada</p>
                <p className="text-sm text-muted-foreground">{connection?.connected_email}</p>
                {connection?.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Última sincronização: {format(new Date(connection.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Sincronização automática</p>
                <p className="text-sm text-muted-foreground">
                  Sincronizar reuniões automaticamente ao criar, editar ou excluir
                </p>
              </div>
              <Switch
                checked={isSyncEnabled}
                onCheckedChange={(checked) => toggleSync.mutate(checked)}
                disabled={toggleSync.isPending}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Importar eventos do Google</p>
                <p className="text-sm text-muted-foreground">
                  Importe eventos existentes do Google Calendar para o Orbity
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={importDays} onValueChange={setImportDays}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Próximos 7 dias</SelectItem>
                    <SelectItem value="14">Próximos 14 dias</SelectItem>
                    <SelectItem value="30">Próximos 30 dias</SelectItem>
                    <SelectItem value="60">Próximos 60 dias</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => importEvents.mutate(parseInt(importDays))}
                  disabled={importEvents.isPending}
                >
                  {importEvents.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Importar
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://calendar.google.com", "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir Google Calendar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => disconnectGoogleCalendar.mutate()}
                disabled={disconnectGoogleCalendar.isPending}
              >
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Recursos disponíveis:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sincronização automática de reuniões</li>
                <li>• Geração de links do Google Meet</li>
                <li>• Convites automáticos para participantes</li>
                <li>• Atualização bidirecional de eventos</li>
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
