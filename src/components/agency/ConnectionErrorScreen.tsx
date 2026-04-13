import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface ConnectionErrorScreenProps {
  onRetry: () => Promise<void>;
}

export function ConnectionErrorScreen({ onRetry }: ConnectionErrorScreenProps) {
  const { signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      window.location.reload();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-background to-orange-50 dark:from-yellow-950/20 dark:via-background dark:to-orange-950/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <WifiOff className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl text-yellow-800 dark:text-yellow-300">
            Falha de Conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Não foi possível verificar seus dados. Isso pode ser um problema 
            temporário de rede. Tente novamente em alguns instantes.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              className="w-full"
              disabled={retrying}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Tentando...' : 'Tentar Novamente'}
            </Button>

            <Button 
              onClick={() => signOut()} 
              variant="destructive" 
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Se o problema persistir, verifique sua conexão com a internet 
            ou entre em contato com o suporte. (Erro: falha de rede)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
