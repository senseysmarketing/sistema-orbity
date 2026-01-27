import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function NoAgencyScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-background to-red-50 dark:from-orange-950/20 dark:via-background dark:to-red-950/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl text-orange-800 dark:text-orange-300">
            Acesso Não Disponível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Sua conta não está vinculada a nenhuma agência. 
            Isso pode acontecer se você foi removido de uma agência 
            ou se sua conta foi desativada.
          </p>
          
          <Button 
            onClick={() => signOut()} 
            variant="destructive" 
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com o 
            administrador da sua agência ou com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
