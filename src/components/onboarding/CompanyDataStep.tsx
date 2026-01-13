import { useState } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { trackFormCompleted, trackValidationError } from '@/lib/metaPixel';

const companySchema = z.object({
  name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  contactEmail: z.string().email('Email inválido'),
  contactPhone: z.string().optional(),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = companySchema.parse(formData);
      setErrors({});
      
      // Rastrear formulário preenchido com sucesso
      const filledFields = Object.values(formData).filter(v => v && v.trim() !== '').length;
      trackFormCompleted({
        form_name: 'company_data',
        step: 1,
        fields_filled: filledFields,
      });
      
      updateCompanyData(validatedData as any);
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
            <Label htmlFor="contactPhone">Telefone de Contato</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(16) 98889-1234"
              maxLength={16}
            />
          </div>

          <Button type="submit" className="w-full">
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}