import { useState } from "react";
import { Facebook, AlertCircle } from "lucide-react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FacebookConnectionDialogProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function FacebookConnectionDialog({ onSuccess, onClose }: FacebookConnectionDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFacebookConnect = async () => {
    setIsConnecting(true);
    setProgress(10);
    setError(null);

    let popup: Window | null = null;
    let pollId: number | undefined;
    let authCompleted = false;

  const messageHandler = async (event: MessageEvent) => {
    console.log('Message received:', event);
    
    // Parse the payload safely
    let payload;
    try {
      payload = event.data;
      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }
    } catch (e) {
      console.warn('Failed to parse message data:', e);
      return;
    }

    if (!payload || payload.type !== 'facebook_oauth') {
      console.log('Ignoring non-facebook message:', payload);
      return;
    }

    console.log('Facebook OAuth message received:', payload);
    authCompleted = true; // Mark as completed before any async work

    // Clean up listeners and popup
    window.removeEventListener('message', messageHandler);
    if (popup && !popup.closed) {
      popup.close();
      console.log('Popup closed');
    }
    if (pollId) {
      window.clearInterval(pollId);
      console.log('Polling stopped');
    }

    if (!payload.success) {
      console.error('Facebook OAuth failed:', payload.error);
      setError(payload.error || 'Falha na autenticação do Facebook');
      toast({
        title: 'Erro na autenticação',
        description: 'Não foi possível autenticar no Facebook. Tente novamente.',
        variant: 'destructive',
      });
      setIsConnecting(false);
      setProgress(0);
      return;
    }

    try {
      console.log('Saving Facebook token...');
      setProgress(75);
      const { error: saveError } = await supabase.functions.invoke('facebook-auth', {
        body: { 
          action: 'save_token', 
          access_token: payload.access_token, 
          expires_in: payload.expires_in 
        }
      });
      
      if (saveError) {
        console.error('Save token error:', saveError);
        throw saveError;
      }

      console.log('Facebook token saved successfully');
      setProgress(100);
      toast({
        title: 'Conectado com sucesso!',
        description: 'Sua conta do Facebook foi conectada. Agora você pode selecionar suas contas de anúncios.',
      });
      onSuccess();
    } catch (e: any) {
      console.error('Erro ao salvar token do Facebook:', e);
      setError(e.message || 'Erro ao salvar conexão do Facebook');
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a conexão do Facebook.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
      setProgress(0);
    }
  };

    try {
      setProgress(30);
      const { data, error } = await supabase.functions.invoke('facebook-auth', {
        body: { action: 'initiate_auth' }
      });
      if (error) throw error;

      const authUrl = data?.authUrl as string | undefined;
      if (!authUrl) throw new Error('URL de autenticação não recebida');

      setProgress(50);
      window.addEventListener('message', messageHandler);
      popup = window.open(authUrl, 'fb_oauth', 'width=600,height=700');
      if (!popup) throw new Error('Não foi possível abrir a janela de autenticação');

      // Detect user closing the popup before completion
      pollId = window.setInterval(async () => {
        if (!popup) return;
        if (popup.closed) {
          if (pollId) window.clearInterval(pollId);
          pollId = undefined;

          // If we already handled auth success, just return.
          if (authCompleted) {
            console.log('Popup closed after completion');
            return; // Do nothing, flow already finished
          }

          // Try to verify on the server if the connection was saved
          try {
            console.log('Popup closed before message. Verifying connection on server...');
            setProgress(85);
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('facebook-auth', {
              body: { action: 'verify_connection' }
            });

            if (verifyError) {
              console.warn('Verify connection error:', verifyError);
            }

            if (verifyData?.connected) {
              console.log('Connection verified on server after popup close.');
              authCompleted = true;
              setProgress(100);
              toast({
                title: 'Conectado com sucesso!',
                description: 'Sua conta do Facebook foi conectada.',
              });
              onSuccess();
            } else {
              console.log('Connection not verified; keeping dialog open for retry.');
              // Do not show cancellation warning as requested
            }
          } catch (err) {
            console.warn('Error verifying connection:', err);
          } finally {
            setIsConnecting(false);
            setProgress(0);
            window.removeEventListener('message', messageHandler);
          }
        }
      }, 500);
    } catch (e: any) {
      console.error('Erro ao conectar Facebook:', e);
      setError(e.message || 'Erro ao iniciar autenticação com o Facebook');
      toast({
        title: 'Erro na conexão',
        description: 'Não foi possível iniciar a autenticação. Tente novamente.',
        variant: 'destructive',
      });
      setIsConnecting(false);
      setProgress(0);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Facebook className="h-6 w-6 text-blue-600" />
          Conectar Facebook Business
        </DialogTitle>
        <DialogDescription>
          Conecte sua conta do Facebook Business para acessar suas contas de anúncios do Meta Ads.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <h4 className="font-medium">O que será acessado:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Informações básicas da conta</li>
            <li>• Lista de contas de anúncios</li>
            <li>• Métricas e relatórios de campanhas</li>
            <li>• Saldo das contas de anúncios</li>
          </ul>
        </div>

        {isConnecting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Conectando...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isConnecting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleFacebookConnect}
            className="flex-1"
            disabled={isConnecting}
          >
            {isConnecting ? (
              "Conectando..."
            ) : (
              <>
                <Facebook className="mr-2 h-4 w-4" />
                Conectar
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}