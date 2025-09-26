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

    try {
      // Simular progresso
      setProgress(30);
      
      // Aqui será implementada a integração real com Facebook
      // Por enquanto, simular o processo
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProgress(60);
      
      // Chamar edge function para autenticação Facebook
      const { data, error } = await supabase.functions.invoke('facebook-auth', {
        body: { action: 'initiate_auth' }
      });

      if (error) throw error;
      
      setProgress(90);
      
      // Simular conclusão
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(100);
      
      toast({
        title: "Conectado com sucesso!",
        description: "Sua conta do Facebook foi conectada. Agora você pode selecionar suas contas de anúncios.",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao conectar Facebook:', error);
      setError(error.message || 'Erro ao conectar com o Facebook');
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar com o Facebook. Tente novamente.",
        variant: "destructive",
      });
    } finally {
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