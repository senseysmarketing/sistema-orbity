import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Building2, Sparkles } from 'lucide-react';
import sensysLogo from '@/assets/senseys-logo-new.png';
import authBackground from '@/assets/auth-background.jpg';
export default function Auth() {
  const {
    user,
    loading,
    signIn
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await signIn(loginEmail, loginPassword);
    setIsLoading(false);
  };
  return <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative" style={{
    backgroundImage: `url(${authBackground})`
  }}>
      {/* Overlay para melhor legibilidade */}
      <div className="absolute inset-0 bg-black/0 backdrop-blur-[1px]"></div>
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={sensysLogo} alt="Senseys Marketing Imobiliário" className="h-16 w-auto object-contain" />
          </div>
          <p className="text-black">Controle geral de produtividade e tarefas</p>
        </div>

        {/* Auth Forms */}
        <Card className="card-modern">
          <CardHeader className="text-center">
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input id="login-password" type="password" placeholder="Sua senha" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={isLoading}>
                {isLoading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </> : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Onboarding CTA */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-black">
            <span>Ainda não tem uma agência?</span>
          </div>
          <Button 
            asChild 
            variant="outline" 
            className="w-full bg-white/90 hover:bg-white border-primary/20 text-primary hover:text-primary/80"
          >
            <Link to="/onboarding" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Criar Nova Agência</span>
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-black/70">
            🚀 Setup automático • 7 dias grátis • Sem cartão de crédito
          </p>
        </div>
        
        <p className="text-center text-sm text-black">Sistema desenvolvido pelo BielzinDelas</p>
      </div>
    </div>;
}