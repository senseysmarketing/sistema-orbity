import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Send, Loader2, Play, Pause, Bot, 
  WifiOff, Zap, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { cn } from "@/lib/utils";

interface WhatsAppChatProps {
  leadId: string;
  leadPhone: string | null;
}

export function WhatsAppChat({ leadId, leadPhone }: WhatsAppChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    account,
    isConnected,
    sendMessage,
    startAutomation,
    toggleAutomation,
    useConversationMessages,
    useLeadConversation,
    useLeadAutomation,
  } = useWhatsApp();

  const { data: conversation, isLoading: loadingConv } = useLeadConversation(leadId);
  const { data: messages = [], isLoading: loadingMessages } = useConversationMessages(conversation?.id || null);
  const { data: automation } = useLeadAutomation(leadId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !leadPhone) return;
    await sendMessage.mutateAsync({
      phone_number: leadPhone,
      message: newMessage.trim(),
      conversation_id: conversation?.id,
      lead_id: leadId,
    });
    setNewMessage("");
  };

  const handleStartAutomation = () => {
    if (!leadPhone) return;
    startAutomation.mutate({ lead_id: leadId, phone_number: leadPhone });
  };

  const getAutomationStatusBadge = () => {
    if (!automation) return null;
    const statusMap: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
      active: { label: 'Automação ativa', variant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <Zap className="h-3 w-3" /> },
      processing: { label: 'Processando', variant: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
      paused: { label: 'Pausada', variant: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', icon: <Pause className="h-3 w-3" /> },
      responded: { label: 'Cliente respondeu', variant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <MessageSquare className="h-3 w-3" /> },
      finished: { label: 'Finalizada', variant: 'bg-muted text-muted-foreground', icon: null },
    };
    const status = statusMap[automation.status] || statusMap.finished;
    return (
      <Badge variant="outline" className={cn("text-xs gap-1", status.variant)}>
        {status.icon}
        {status.label}
      </Badge>
    );
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          WhatsApp não configurado. Configure em Configurações {'>'} Integrações.
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          WhatsApp desconectado. Reconecte em Configurações {'>'} Integrações.
        </p>
      </div>
    );
  }

  if (!leadPhone) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Este lead não possui telefone cadastrado.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Header with automation controls */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {getAutomationStatusBadge()}
          {automation && (
            <span className="text-xs text-muted-foreground truncate">
              {automation.current_phase} - etapa {automation.current_step_position}
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!automation || automation.status === 'finished' || automation.status === 'responded' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartAutomation}
              disabled={startAutomation.isPending}
              className="text-xs h-7"
            >
              {startAutomation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Bot className="mr-1 h-3 w-3" />
              )}
              Iniciar Automação
            </Button>
          ) : automation.status === 'active' || automation.status === 'processing' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAutomation.mutate({ automation_id: automation.id, action: 'pause' })}
              className="text-xs h-7"
            >
              <Pause className="mr-1 h-3 w-3" />
              Pausar
            </Button>
          ) : automation.status === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAutomation.mutate({ automation_id: automation.id, action: 'resume' })}
              className="text-xs h-7"
            >
              <Play className="mr-1 h-3 w-3" />
              Retomar
            </Button>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-3">
        {loadingMessages || loadingConv ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-2 px-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.is_from_me ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg.is_from_me
                      ? "bg-green-600 text-white dark:bg-green-700"
                      : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content || `[${msg.message_type}]`}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    msg.is_from_me ? "text-green-200" : "text-muted-foreground"
                  )}>
                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t flex-shrink-0">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={sendMessage.isPending || !newMessage.trim()}
          className="flex-shrink-0"
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
