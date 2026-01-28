import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, X } from "lucide-react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('[PWA] Service Worker registrado:', swUrl);
      // Verificar atualizações a cada 1 hora (não força reload)
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Erro ao registrar SW:', error);
    },
  });

  const handleUpdate = async () => {
    try {
      // Limpar todos os caches antes de atualizar para evitar conflitos
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[PWA] Limpando caches antes de atualizar:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (error) {
      console.error('[PWA] Erro ao limpar caches:', error);
    }
    
    // Agora atualizar o Service Worker
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <Alert className="fixed top-4 right-4 w-auto max-w-sm z-50 border-primary/20 bg-background shadow-lg animate-in slide-in-from-top-2">
      <RefreshCw className="h-4 w-4 text-primary" />
      <AlertTitle className="text-sm font-semibold">Dados Desatualizados</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground mt-1">
        Uma nova versão está disponível.
      </AlertDescription>
      <div className="flex gap-2 mt-3">
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleDismiss}
          className="h-7 text-xs"
        >
          Mais tarde
        </Button>
        <Button 
          size="sm" 
          onClick={handleUpdate}
          className="h-7 text-xs"
        >
          Atualizar
        </Button>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDismiss}
        className="absolute top-2 right-2 h-6 w-6"
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
}
