import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Building2, Sparkles } from "lucide-react";
import orbityLogo from "@/assets/orbity-logo.png";
import authBackground from "@/assets/auth-background-new.png";
export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${authBackground})`,
      }}
    >
      {/* Overlay para melhor legibilidade */}
      <div className="absolute inset-0 bg-black/0 backdrop-blur-[1px]"></div>
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={orbityLogo} alt="Orbity - Sistema de Gestão" className="h-16 w-auto object-contain" />
          </div>
          <p className="text-white">Sistema de gestão para agências de marketing</p>
        </div>

        {/* Auth Forms */}
        <Card className="backdrop-blur-lg bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Acesse sua conta</CardTitle>
            <CardDescription className="text-white">Entre com suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Sua senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full gradient-primary text-white w-full ">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Onboarding CTA */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-sm text-white">
            <span>Ainda não tem uma agência?</span>
          </div>
          <Button
            asChild
            variant="outline"
            className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white hover:text-white backdrop-blur-sm"
          >
            <Link to="/onboarding" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Criar Nova Agência</span>
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-white/80">🚀 Setup automático • 7 dias grátis • Sem cartão de crédito</p>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-white/80">Sistema desenvolvido por Senseys - Digital Performance</p>
          <Link to="/privacy-policy" className="text-xs text-white/60 hover:text-white/90 underline underline-offset-2">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
