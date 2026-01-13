import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { trackFormCompleted, trackValidationError } from '@/lib/metaPixel';

const adminUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export function AdminUserStep() {
  const { onboardingData, updateAdminUser, nextStep, prevStep } = useOnboarding();
  const [formData, setFormData] = useState({
    name: onboardingData.adminUser?.name || '',
    email: onboardingData.adminUser?.email || '',
    password: onboardingData.adminUser?.password || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = adminUserSchema.parse(formData);
      setErrors({});
      
      // Rastrear formulário preenchido com sucesso
      const filledFields = Object.values(formData).filter(v => v && v.trim() !== '').length;
      trackFormCompleted({
        form_name: 'admin_user',
        step: 3,
        fields_filled: filledFields,
      });
      
      updateAdminUser(validatedData as any);
      nextStep();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            const fieldName = err.path[0] as string;
            newErrors[fieldName] = err.message;
            
            // Rastrear erro de validação
            trackValidationError({
              step: 3,
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
          <UserCheck className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Primeiro Usuário Administrador</CardTitle>
        <p className="text-muted-foreground">
          Crie a conta do administrador principal da agência
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Digite seu nome completo"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="seu@email.com"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Este será o email de login do administrador
            </p>
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Crie uma senha segura"
                className={errors.password ? 'border-destructive' : ''}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive mt-1">{errors.password}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo de 6 caracteres
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-blue-900">
                  Conta de Administrador
                </h4>
                <p className="text-xs text-blue-700">
                  Este usuário terá acesso completo à agência, incluindo configurações,
                  usuários, clientes e todas as funcionalidades administrativas.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button type="submit">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}