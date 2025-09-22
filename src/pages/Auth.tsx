import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, User, Palette, TrendingUp } from 'lucide-react';
import sensysLogo from '@/assets/senseys-logo-new.png';
import authBackground from '@/assets/auth-background.jpg';
export default function Auth() {
  const {
    user,
    loading,
    signIn,
    signUp
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up form state
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpRole, setSignUpRole] = useState('');
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
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpRole) {
      return;
    }
    setIsLoading(true);
    const {
      error
    } = await signUp(signUpEmail, signUpPassword, signUpName, signUpRole);
    if (!error) {
      // Reset form
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpName('');
      setSignUpRole('');
    }
    setIsLoading(false);
  };
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'gestor_trafego':
        return <TrendingUp className="h-4 w-4" />;
      case 'designer':
        return <Palette className="h-4 w-4" />;
      case 'administrador':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
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
          <p className="text-black">
            Controle de produtividade para agências de marketing
          </p>
        </div>

        {/* Auth Forms */}
        <Card className="card-modern">
          <CardHeader className="text-center">
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>
              Entre com suas credenciais ou crie uma nova conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
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
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input id="signup-name" type="text" placeholder="Seu nome completo" value={signUpName} onChange={e => setSignUpName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="seu@email.com" value={signUpEmail} onChange={e => setSignUpEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" placeholder="Crie uma senha forte" value={signUpPassword} onChange={e => setSignUpPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Função na agência</Label>
                    <Select value={signUpRole} onValueChange={setSignUpRole} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione sua função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor_trafego">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon('gestor_trafego')}
                            <span>Gestor de Tráfego</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="designer">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon('designer')}
                            <span>Designer</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="administrador">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon('administrador')}
                            <span>Administrador</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={isLoading || !signUpRole}>
                    {isLoading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </> : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-black">
          Sistema desenvolvido para a Agência Senseys
        </p>
      </div>
    </div>;
}