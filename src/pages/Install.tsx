import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Share2, Smartphone, Monitor, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import orbityLogo from "@/assets/orbity-logo.png";

export default function Install() {
  const { canInstall, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const navigate = useNavigate();

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      navigate('/auth');
    }
  };

  // Já instalado
  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">App Instalado!</CardTitle>
            <CardDescription className="text-white/70">
              O Orbity já está instalado no seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Acessar o App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={orbityLogo} alt="Orbity" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl text-white">Instale o Orbity</CardTitle>
          <CardDescription className="text-white/70">
            Tenha acesso rápido ao sistema direto da sua tela inicial
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* iOS Instructions */}
          {isIOS && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <div className="text-white/90">
                  <p className="font-medium">Toque no botão Compartilhar</p>
                  <p className="text-sm text-white/60 mt-1 flex items-center gap-1">
                    <Share2 className="h-4 w-4" /> na barra do Safari
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <div className="text-white/90">
                  <p className="font-medium">Selecione "Adicionar à Tela de Início"</p>
                  <p className="text-sm text-white/60 mt-1">
                    Role para baixo se necessário
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <div className="text-white/90">
                  <p className="font-medium">Confirme tocando em "Adicionar"</p>
                  <p className="text-sm text-white/60 mt-1">
                    Pronto! O ícone aparecerá na sua tela
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Android/Desktop Install Button */}
          {canInstall && (
            <div className="space-y-4">
              <Button 
                onClick={handleInstall} 
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Instalar Agora
              </Button>
              <p className="text-center text-white/60 text-sm">
                {isAndroid ? (
                  <>O app será adicionado à sua tela inicial</>
                ) : (
                  <>O app será instalado como aplicativo desktop</>
                )}
              </p>
            </div>
          )}

          {/* Generic Instructions if can't install */}
          {!isIOS && !canInstall && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <p className="text-yellow-200 text-sm">
                  <strong>Dica:</strong> Use o Chrome ou Edge para instalar o app. 
                  Procure o ícone de instalação na barra de endereço.
                </p>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <Monitor className="h-8 w-8 text-white/60" />
                <div className="text-white/90">
                  <p className="font-medium">Desktop</p>
                  <p className="text-sm text-white/60">
                    Clique no ícone de instalação na barra de endereço
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <Smartphone className="h-8 w-8 text-white/60" />
                <div className="text-white/90">
                  <p className="font-medium">Mobile</p>
                  <p className="text-sm text-white/60">
                    Use o menu do navegador → "Instalar app"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-white/60 text-sm mb-3 font-medium">Benefícios do app:</p>
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Acesso rápido sem abrir navegador
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Notificações push em tempo real
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Funciona offline com dados em cache
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                Experiência de app nativo
              </li>
            </ul>
          </div>

          {/* Skip link */}
          <div className="text-center pt-2">
            <Button 
              variant="link" 
              onClick={() => navigate('/auth')}
              className="text-white/60 hover:text-white"
            >
              Continuar no navegador
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
