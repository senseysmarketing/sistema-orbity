import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Building2, CheckCircle } from 'lucide-react';

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface InviteData {
  email: string;
  owner_name: string;
  agency_name: string;
  expires_at: string;
}

export default function RegisterByInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Link inválido. Solicite um novo convite ao administrador.');
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      const { data, error: fetchError } = await supabase
        .from('agency_invites')
        .select('email, owner_name, expires_at, used_at, agencies(name)')
        .eq('token', token)
        .maybeSingle();

      if (fetchError || !data) {
        setError('Convite não encontrado ou inválido.');
        setLoading(false);
        return;
      }

      if (data.used_at) {
        setError('Este convite já foi utilizado. Se você já possui uma conta, faça login.');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('Este convite expirou. Solicite um novo ao administrador.');
        setLoading(false);
        return;
      }

      setInviteData({
        email: data.email,
        owner_name: data.owner_name,
        agency_name: (data as any).agencies?.name || 'Agência',
        expires_at: data.expires_at,
      });
      setLoading(false);
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('complete-invite', {
        body: {
          token,
          password,
          phone: phone ? '55' + phone.replace(/\D/g, '') : undefined,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast.success('Conta criada com sucesso! Faça login para continuar.');
      navigate('/auth');
    } catch (err: any) {
      console.error('Registration error:', err);
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Crie sua conta</CardTitle>
          <CardDescription>
            Você foi convidado para gerenciar a agência <strong>{inviteData?.agency_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={inviteData?.owner_name || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={inviteData?.email || ''} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp (opcional)</Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground shrink-0">+55</div>
                <Input
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={e => setPhone(formatPhoneBR(e.target.value))}
                  maxLength={15}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Senha *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Confirmar Senha *</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
              {confirmPassword && password === confirmPassword && password.length >= 6 && (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Senhas coincidem
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || password.length < 6 || password !== confirmPassword}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Já possui uma conta?{' '}
              <button type="button" onClick={() => navigate('/auth')} className="text-primary underline">
                Faça login
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
