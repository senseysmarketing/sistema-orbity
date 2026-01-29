import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, X } from "lucide-react";

const DISMISS_KEY = 'pwa_update_dismissed_at';
const DISMISS_TYPE_KEY = 'pwa_dismiss_type';
const DISMISS_COOLDOWN_HOURS = 24;      // "Mais tarde" = 24h
const QUICK_DISMISS_COOLDOWN_HOURS = 4; // "X" = 4h

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('[PWA] Service Worker registrado:', swUrl);
      // Verificar atualizações a cada 1 hora
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

  // Verificar se passou o cooldown desde a última recusa
  const shouldShowPrompt = (): boolean => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) return true;
    
    const dismissedTime = parseInt(dismissedAt, 10);
    const hoursSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60);
    
    const dismissType = localStorage.getItem(DISMISS_TYPE_KEY);
    const cooldownHours = dismissType === 'quick' 
      ? QUICK_DISMISS_COOLDOWN_HOURS 
      : DISMISS_COOLDOWN_HOURS;
      
    return hoursSinceDismiss >= cooldownHours;
  };

  const handleUpdate = async () => {
    // Limpar cooldown ao atualizar
    localStorage.removeItem(DISMISS_KEY);
    localStorage.removeItem(DISMISS_TYPE_KEY);
    
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('[PWA] Limpando todos os caches:', cacheNames);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          const isRootScope = reg.scope.endsWith('/') && reg.scope.split('/').length <= 4;
          if (!isRootScope) {
            console.log('[PWA] Removendo SW secundário:', reg.scope);
            await reg.unregister();
          }
        }
      }
    } catch (error) {
      console.error('[PWA] Erro ao limpar antes de atualizar:', error);
    }
    
    updateServiceWorker(true);
  };

  // "Mais tarde" - cooldown maior (24h)
  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    localStorage.setItem(DISMISS_TYPE_KEY, 'full');
    setNeedRefresh(false);
  };

  // Botão X - cooldown menor (4h)
  const handleQuickDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    localStorage.setItem(DISMISS_TYPE_KEY, 'quick');
    setNeedRefresh(false);
  };

  // Só mostra se há atualização E passou o cooldown
  if (!needRefresh || !shouldShowPrompt()) return null;

  return (
    <Alert className="fixed top-4 right-4 w-auto max-w-sm z-50 border-primary/20 bg-background shadow-lg animate-in slide-in-from-top-2">
      <RefreshCw className="h-4 w-4 text-primary" />
      <AlertTitle className="text-sm font-semibold">Atualização Disponível</AlertTitle>
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
        onClick={handleQuickDismiss}
        className="absolute top-2 right-2 h-6 w-6"
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
}
