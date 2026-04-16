import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Building2, ArrowRight, Loader2, ShieldCheck, RefreshCw, LifeBuoy, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { trackFormCompleted, trackValidationError } from '@/lib/metaPixel';

const companySchema = z.object({
  name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().min(14, 'WhatsApp obrigatório para validação'),
});

export function CompanyDataStep() {
  const { onboardingData, updateCompanyData, nextStep } = useOnboarding();
  const [formData, setFormData] = useState({
    name: onboardingData.companyData?.name || '',
    description: onboardingData.companyData?.description || '',
    contactEmail: onboardingData.companyData?.contactEmail || '',
    contactPhone: onboardingData.companyData?.contactPhone || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP states
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const validatedDataRef = useRef<any>(null);

  // Countdown timer
  useEffect(() => {
    if (!showOtp || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showOtp, countdown]);

  // OTP verification
  useEffect(() => {
    if (otpCode.length !== 6) return;
    if (otpCode === generatedCode) {
      toast.success('Telefone validado!');
      if (validatedDataRef.current) {
        updateCompanyData(validatedDataRef.current);
      }
      nextStep();
    } else {
      toast.error('Código incorreto.');
      setOtpCode('');
    }
  }, [otpCode, generatedCode, updateCompanyData, nextStep]);

  const generateAndSendOTP = useCallback(async (phone: string) => {
    setIsSendingOtp(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const cleanedPhone = phone.replace(/\D/g, '');

      const response = await fetch('https://senseys-n8n.cloudfy.cloud/webhook/validador-orbity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanedPhone, code }),
      });

      if (!response.ok) {
        throw new Error('Webhook failed');
      }

      setGeneratedCode(code);
      setCountdown(60);
      setOtpCode('');
      setShowOtp(true);
    } catch {
      toast.error('Erro ao contactar o servidor. Tente novamente.');
    } finally {
      setIsSendingOtp(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = companySchema.parse(formData);
      setErrors({});

      const filledFields = Object.values(formData).filter(v => v && v.trim() !== '').length;
      trackFormCompleted({
        form_name: 'company_data',
        step: 1,
        fields_filled: filledFields,
      });

      validatedDataRef.current = validatedData;
      generateAndSendOTP(formData.contactPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            const fieldName = err.path[0] as string;
            newErrors[fieldName] = err.message;
            trackValidationError({
              step: 1,
              field: fieldName,
              error_message: err.message,
            });
          }
        });
        setErrors(newErrors);
      }
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.slice(0, 11);

    if (limited.length <= 2) {
      return limited.length ? `(${limited}` : '';
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formattedPhone = formatPhoneNumber(value);
    handleChange('contactPhone', formattedPhone);
  };

  const handleResendOtp = () => {
    generateAndSendOTP(formData.contactPhone);
  };

  const handleChangeNumber = () => {
    setShowOtp(false);
    setOtpCode('');
    setCountdown(60);
  };

  // ─── OTP Validation Screen ───
  if (showOtp) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verifique o seu WhatsApp</CardTitle>
          <p className="text-muted-foreground text-sm">
            Enviámos um código de segurança de 6 dígitos para o número{' '}
            <span className="font-semibold text-foreground">{formData.contactPhone}</span>.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              disabled={isSendingOtp}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={countdown > 0 || isSendingOtp}
              onClick={handleResendOtp}
              className="text-muted-foreground"
            >
              {isSendingOtp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {countdown > 0
                ? `Reenviar em 00:${countdown.toString().padStart(2, '0')}`
                : 'Reenviar código'}
            </Button>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleChangeNumber}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Alterar número
              </Button>

              <Button
                variant="link"
                size="sm"
                asChild
                className="text-muted-foreground"
              >
                <a
                  href="https://wa.me/5516988891234"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Preciso de ajuda
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Company Data Form ───
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Dados da Empresa</CardTitle>
        <p className="text-muted-foreground">
          Vamos começar com as informações básicas da sua agência
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nome da Empresa *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Digite o nome da sua agência"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descrição da Empresa</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Conte um pouco sobre a sua agência (opcional)"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">Email de Contato *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              placeholder="contato@suaagencia.com"
              className={errors.contactEmail ? 'border-destructive' : ''}
            />
            {errors.contactEmail && (
              <p className="text-sm text-destructive mt-1">{errors.contactEmail}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contactPhone">WhatsApp de Contato *</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(16) 98889-1234"
              maxLength={16}
              className={errors.contactPhone ? 'border-destructive' : ''}
            />
            {errors.contactPhone && (
              <p className="text-sm text-destructive mt-1">{errors.contactPhone}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Insira um WhatsApp válido. Enviaremos um código de 6 dígitos para validar o seu acesso.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSendingOtp}>
            {isSendingOtp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A enviar código...
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
