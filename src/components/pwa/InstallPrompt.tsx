import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, X, Share2, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";

export function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, install, dismissPrompt, shouldShowPrompt } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mostrar após 3 segundos de navegação
    const timer = setTimeout(() => {
      if (shouldShowPrompt && !dismissed) {
        setVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [shouldShowPrompt, dismissed]);

  if (isInstalled || dismissed || !visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    dismissPrompt();
  };

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setDismissed(true);
    }
  };

  // iOS precisa de instruções manuais
  if (isIOS) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-2xl border-0 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base">Instale o Orbity</p>
            <p className="text-sm text-white/90 mt-1 leading-relaxed">
              Toque em <Share2 className="inline h-4 w-4 mx-1" /> 
              <span className="font-medium">"Compartilhar"</span> e depois em 
              <span className="font-medium"> "Adicionar à Tela de Início"</span>
            </p>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleDismiss}
            className="flex-shrink-0 text-white hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    );
  }

  // Android/Desktop
  if (!canInstall) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-2xl border-0 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          <Download className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-base">Instale o Orbity</p>
          <p className="text-sm text-white/90">Acesso rápido direto da sua tela inicial</p>
        </div>
        <Button 
          onClick={handleInstall} 
          variant="secondary" 
          size="sm"
          className="flex-shrink-0 bg-white text-purple-700 hover:bg-white/90 font-medium"
        >
          Instalar
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={handleDismiss}
          className="flex-shrink-0 text-white hover:bg-white/20 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  );
}
