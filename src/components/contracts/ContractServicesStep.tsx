import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface Service {
  name: string;
  description: string;
  value: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  default_value: number | null;
}

interface ContractServicesStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

export default function ContractServicesStep({ data, onUpdate }: ContractServicesStepProps) {
  const { currentAgency } = useAgency();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [services, setServices] = useState<Service[]>(data.services || []);

  useEffect(() => {
    if (currentAgency?.id) {
      fetchTemplates();
    }
  }, [currentAgency?.id]);

  useEffect(() => {
    const total = services.reduce((sum, service) => sum + (service.value || 0), 0);
    onUpdate({ services, total_value: total });
  }, [services]);

  const fetchTemplates = async () => {
    if (!currentAgency?.id) return;

    const { data: templatesData } = await supabase
      .from("contract_services_templates")
      .select("*")
      .eq("agency_id", currentAgency.id)
      .eq("is_active", true)
      .order("name");

    if (templatesData) {
      setTemplates(templatesData);
    }
  };

  const addService = () => {
    setServices([...services, { name: "", description: "", value: 0 }]);
  };

  const addFromTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setServices([
        ...services,
        {
          name: template.name,
          description: template.description || "",
          value: template.default_value || 0,
        }
      ]);
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof Service, value: any) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Serviços Contratados</h3>
          <p className="text-sm text-muted-foreground">
            Adicione os serviços que farão parte do contrato
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Select onValueChange={addFromTemplate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Adicionar Template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={addService} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Serviço
          </Button>
        </div>
      </div>

      {services.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Nenhum serviço adicionado ainda</p>
          <Button onClick={addService}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Primeiro Serviço
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {services.map((service, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Nome do Serviço</Label>
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(index, "name", e.target.value)}
                      placeholder="Ex: Gestão de Tráfego Pago"
                    />
                  </div>
                  <div className="w-[200px] space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={service.value}
                      onChange={(e) => updateService(index, "value", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(index)}
                    className="mt-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Descrição do Serviço</Label>
                  <Textarea
                    value={service.description}
                    onChange={(e) => updateService(index, "description", e.target.value)}
                    placeholder="Descreva o que está incluído neste serviço..."
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          ))}

          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Valor Total do Contrato</span>
              <span className="text-2xl font-bold">
                R$ {data.total_value?.toFixed(2) || "0.00"}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
