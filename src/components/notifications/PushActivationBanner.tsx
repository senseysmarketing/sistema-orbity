import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";

export function PushActivationBanner() {
  const { user } = useAuth();
  const { 
    permission, 
    token, 
    isSupported, 
    hasFirebaseConfig,
    isLoading,
    requestPermission,
    isStandaloneMode,
    isIOS,
    isAndroid,
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Key for localStorage to remember if user dismissed
  const DISMISSED_KEY = 'orbity_push_banner_dismissed';

  useEffect(() => {
    // Check if already dismissed this session
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY);
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show banner after 5 seconds if conditions met
    const timer = setTimeout(() => {
      const shouldShow = 
        user && 
        hasFirebaseConfig && 
        isSupported && 
        permission !== 'granted' && 
        !token &&
        // Don't show for iOS users not in PWA (they need to install first)
        !(isIOS && !isStandaloneMode);

      if (shouldShow) {
        setVisible(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, hasFirebaseConfig, isSupported, permission, token, isIOS, isStandaloneMode]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, 'true');
  };

  const handleActivate = async () => {
    const result = await requestPermission();
    if (result) {
      handleDismiss();
    }
  };

  if (!visible || dismissed) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-2xl border-0 animate-in slide-in-from-bottom-5 duration-300 md:left-auto md:right-4 md:max-w-md">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          <Bell className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base">Ative as Notificações Push 🔔</p>
          <p className="text-sm text-white/90 mt-1">
            {isAndroid 
              ? 'Receba alertas de tarefas, leads e reuniões em tempo real no seu Android.'
              : 'Receba alertas de tarefas, leads e reuniões em tempo real.'
            }
          </p>
          <div className="flex gap-2 mt-3">
            <Button 
              onClick={handleActivate} 
              variant="secondary" 
              size="sm"
              disabled={isLoading}
              className="bg-white text-purple-700 hover:bg-white/90 font-medium"
            >
              {isLoading ? 'Ativando...' : 'Ativar Agora'}
            </Button>
            <Button 
              onClick={handleDismiss}
              variant="ghost" 
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/20"
            >
              Depois
            </Button>
          </div>
        </div>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={handleDismiss}
          className="flex-shrink-0 text-white hover:bg-white/20 hover:text-white h-8 w-8"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Platform-specific tip */}
      {isAndroid && !isStandaloneMode && (
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-white/70" />
          <p className="text-xs text-white/70">
            Dica: Instale o app pelo menu ⋮ para notificações ainda mais confiáveis.
          </p>
        </div>
      )}
    </Card>
  );
}
