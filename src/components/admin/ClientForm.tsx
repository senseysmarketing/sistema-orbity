import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { Loader2, Info } from "lucide-react";

// Validação de CPF
function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
}

// Máscaras
function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, '$1-$2');
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  client?: any;
  onClientCreated?: (client: any) => void;
}

const initialFormData = {
  name: '',
  email: '',
  contact: '',
  service: '',
  monthly_value: '',
  active: true,
  start_date: '',
  due_date: '1',
  observations: '',
  contract_start_date: null as string | null,
  contract_end_date: null as string | null,
  has_loyalty: true,
  document: '',
  zip_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  default_billing_type: 'manual',
  billing_automation_enabled: true,
};

export function ClientForm({ open, onOpenChange, onSuccess, client, onClientCreated }: ClientFormProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const { enabledGateways } = usePaymentGateway();
  
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [lastFetchedCep, setLastFetchedCep] = useState('');
  
  const [formData, setFormData] = useState({ ...initialFormData });

  const isEditing = !!client;

  useEffect(() => {
    if (!open) return;
    if (client) {
      setFormData({
        name: client.name || '',
        email: client.email || '',
        contact: client.contact || '',
        service: client.service || '',
        monthly_value: client.monthly_value?.toString() || '',
        active: client.active ?? true,
        start_date: client.start_date || '',
        due_date: client.due_date?.toString() || '1',
        observations: client.observations || '',
        contract_start_date: client.contract_start_date || null,
        contract_end_date: client.contract_end_date || null,
        has_loyalty: client.has_loyalty ?? true,
        document: client.document || '',
        zip_code: client.zip_code || '',
        street: client.street || '',
        number: client.number || '',
        complement: client.complement || '',
        neighborhood: client.neighborhood || '',
        city: client.city || '',
        state: client.state || '',
        default_billing_type: client.default_billing_type || 'manual',
        billing_automation_enabled: client.billing_automation_enabled ?? true,
      });
      const existingCep = (client.zip_code || '').replace(/\D/g, '');
      if (existingCep.length === 8) {
        setLastFetchedCep(existingCep);
      }
    } else {
      setFormData({ ...initialFormData });
      setLastFetchedCep('');
    }
    setDocumentError(null);
  }, [client, open]);

  const fetchAddressByCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
        setLastFetchedCep(cleanCep);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  };

  const fetchCnpjData = async (cnpj: string) => {
    setCnpjLoading(true);
    setDocumentError(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cep = (data.cep || '').replace(/\D/g, '');
      setFormData(prev => ({
        ...prev,
        name: data.nome_fantasia || data.razao_social || prev.name,
        email: data.email || prev.email,
        contact: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1.replace(/\D/g, '')) : prev.contact,
        zip_code: cep ? formatCep(cep) : prev.zip_code,
        street: data.logradouro || prev.street,
        number: data.numero || prev.number,
        complement: data.complemento || prev.complement,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.municipio || prev.city,
        state: data.uf || prev.state,
      }));
      // Mark CEP as already fetched to prevent re-fetch on blur
      if (cep.length === 8) {
        setLastFetchedCep(cep);
      }
      toast({
        title: "CNPJ encontrado",
        description: `Dados de "${data.nome_fantasia || data.razao_social}" importados.`,
      });
    } catch {
      toast({
        title: "CNPJ não encontrado",
        description: "Preencha os dados manualmente.",
        variant: "destructive",
      });
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleDocumentChange = (value: string) => {
    const formatted = formatDocument(value);
    const digits = formatted.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, document: formatted }));
    
    if (digits.length === 11) {
      setDocumentError(validateCPF(digits) ? null : "CPF inválido");
    } else if (digits.length === 14) {
      setDocumentError(null);
      fetchCnpjData(digits);
    } else {
      setDocumentError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const docDigits = formData.document.replace(/\D/g, '');
    const contactDigits = formData.contact.replace(/\D/g, '');
    const cepDigits = formData.zip_code.replace(/\D/g, '');
    const missingFields: string[] = [];

    if (!docDigits || (docDigits.length !== 11 && docDigits.length !== 14)) {
      missingFields.push("CPF/CNPJ válido");
    }
    if (docDigits.length === 11 && !validateCPF(docDigits)) {
      toast({
        title: "CPF inválido",
        description: "Verifique o número do documento antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    if (!formData.email.trim()) {
      missingFields.push("E-mail de Faturamento");
    }
    if (!contactDigits || contactDigits.length < 10) {
      missingFields.push("Contato (WhatsApp)");
    }
    if (!cepDigits || cepDigits.length !== 8) {
      missingFields.push("CEP");
    }

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha corretamente: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (formData.has_loyalty && (!formData.contract_start_date || !formData.contract_end_date)) {
      toast({
        title: "Campos obrigatórios",
        description: "Para clientes com fidelidade, as datas de início e fim do contrato são obrigatórias.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const cleanDocument = formData.document.replace(/\D/g, '');
      const cleanZipCode = formData.zip_code.replace(/\D/g, '');

      const data = {
        name: formData.name,
        email: formData.email || null,
        contact: formData.contact,
        service: formData.service,
        monthly_value: formData.monthly_value ? parseFloat(formData.monthly_value) : null,
        active: formData.active,
        start_date: formData.start_date || null,
        due_date: parseInt(formData.due_date),
        observations: formData.observations,
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        has_loyalty: formData.has_loyalty,
        agency_id: currentAgency?.id,
        document: cleanDocument || null,
        zip_code: cleanZipCode || null,
        street: formData.street || null,
        number: formData.number || null,
        complement: formData.complement || null,
        neighborhood: formData.neighborhood || null,
        city: formData.city || null,
        state: formData.state || null,
        default_billing_type: formData.default_billing_type,
        billing_automation_enabled: formData.billing_automation_enabled,
      };

      let savedClientId: string | undefined;

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', client.id);
        if (error) throw error;
      } else {
        const { data: newClientData, error: clientError } = await supabase
          .from('clients')
          .insert([data])
          .select()
          .single();
        
        if (clientError) throw clientError;
        savedClientId = newClientData?.id;

        if (newClientData && onClientCreated) {
          onSuccess();
          onOpenChange(false);
          setFormData({ ...initialFormData });
          onClientCreated(newClientData);
          return;
        }
      }

      toast({
        title: client ? "Cliente atualizado" : "Cliente criado",
        description: client ? "Cliente atualizado com sucesso!" : "Novo cliente criado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({ ...initialFormData });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {client ? 'Edite as informações do cliente.' : 'Adicione um novo cliente ao sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 overflow-auto px-1">
            <div className="space-y-4 py-4 pr-3">

              {/* ── Seção 1: Dados Principais ── */}
              <h3 className="text-sm font-medium text-muted-foreground">Dados Principais</h3>

              {/* CPF/CNPJ — primeiro campo */}
              <div className="grid gap-2">
                <Label htmlFor="document">CPF/CNPJ *</Label>
                <div className="relative">
                  <Input
                    id="document"
                    value={formData.document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className={`${isEditing && !formData.document.replace(/\D/g, '') ? 'border-amber-500 focus-visible:ring-amber-500' : ''} ${documentError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {cnpjLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {documentError && (
                  <p className="text-xs text-destructive">{documentError}</p>
                )}
              </div>

              {/* Nome / Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active" className="text-sm">{formData.active ? 'Ativo' : 'Inativo'}</Label>
                  </div>
                </div>
              </div>

              {/* E-mail / Contato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail de Faturamento *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@empresa.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Receberá faturas e notas fiscais automáticas.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact">Contato (WhatsApp) *</Label>
                  <Input
                    id="contact"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: formatPhone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Receberá links de pagamento e avisos.</p>
                </div>
              </div>

              {/* ── Seção 2: Endereço ── */}
              <Separator className="my-4" />
              <h3 className="text-sm font-medium text-muted-foreground">Endereço</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="zip_code">CEP *</Label>
                  <div className="relative">
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => setFormData({ ...formData, zip_code: formatCep(e.target.value) })}
                      onBlur={() => {
                        const cleanCep = formData.zip_code.replace(/\D/g, '');
                        if (cleanCep.length === 8 && cleanCep !== lastFetchedCep) {
                          fetchAddressByCep(formData.zip_code);
                        }
                      }}
                      placeholder="00000-000"
                      className={isEditing && !formData.zip_code.replace(/\D/g, '') ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Logradouro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="Nº"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Sala, Andar..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* ── Seção 3: Serviço e Contrato ── */}
              <Separator className="my-4" />
              <h3 className="text-sm font-medium text-muted-foreground">Serviço e Contrato</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service">Serviço</Label>
                  <Input
                    id="service"
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    placeholder="Tipo de serviço prestado"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_loyalty"
                    checked={formData.has_loyalty}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_loyalty: checked })}
                  />
                  <Label htmlFor="has_loyalty">Cliente tem fidelidade</Label>
                </div>
              </div>

              {formData.has_loyalty && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Início do Contrato *</Label>
                    <DatePickerDemo
                      date={formData.contract_start_date ? new Date(formData.contract_start_date + 'T00:00:00') : undefined}
                      onDateChange={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setFormData({ ...formData, contract_start_date: `${year}-${month}-${day}` });
                        } else {
                          setFormData({ ...formData, contract_start_date: null });
                        }
                      }}
                      placeholder="Selecione a data de início"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Fim do Contrato *</Label>
                    <DatePickerDemo
                      date={formData.contract_end_date ? new Date(formData.contract_end_date + 'T00:00:00') : undefined}
                      onDateChange={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          setFormData({ ...formData, contract_end_date: `${year}-${month}-${day}` });
                        } else {
                          setFormData({ ...formData, contract_end_date: null });
                        }
                      }}
                      placeholder="Selecione a data de fim"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>

              {/* ── Seção 4: Configurações de Cobrança ── */}
              <Separator className="my-4" />
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Configurações de Cobrança</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="monthly_value">Valor Mensal</Label>
                  <Input
                    id="monthly_value"
                    type="number"
                    step="0.01"
                    value={formData.monthly_value}
                    onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Dia de Vencimento *</Label>
                  <Select
                    value={formData.due_date.toString()}
                    onValueChange={(value) => setFormData({ ...formData, due_date: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="default_billing_type">Forma de Faturamento</Label>
                  <Select
                    value={formData.default_billing_type}
                    onValueChange={(value) => setFormData({ ...formData, default_billing_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledGateways.map((gw) => (
                        <SelectItem key={gw} value={gw}>
                          {gw === 'manual' ? 'Manual' : gw === 'asaas' ? 'Asaas' : 'Conexa'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="billing_automation_enabled" className="font-medium text-sm">Cobrança Automática</Label>
                  <p className="text-xs text-muted-foreground">Permitir que este cliente receba lembretes automáticos de vencimento e atraso via WhatsApp/E-mail.</p>
                </div>
                <Switch
                  id="billing_automation_enabled"
                  checked={formData.billing_automation_enabled}
                  onCheckedChange={(v) => setFormData({ ...formData, billing_automation_enabled: v })}
                />
              </div>
              {enabledGateways.length <= 1 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Apenas faturamento manual ativo. Configure gateways em Configurações &gt; Integrações.
                </p>
              )}

            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (client ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
