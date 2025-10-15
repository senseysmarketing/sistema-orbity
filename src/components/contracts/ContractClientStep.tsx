import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

interface Client {
  id: string;
  name: string;
  contact: string;
}

interface ContractClientStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

export default function ContractClientStep({ data, onUpdate }: ContractClientStepProps) {
  const { currentAgency } = useAgency();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");

  useEffect(() => {
    if (currentAgency?.id) {
      fetchClients();
    }
  }, [currentAgency?.id]);

  const fetchClients = async () => {
    if (!currentAgency?.id) return;

    const { data: clientsData, error } = await supabase
      .from("clients")
      .select("id, name, contact")
      .eq("agency_id", currentAgency.id)
      .eq("active", true)
      .order("name");

    if (!error && clientsData) {
      setClients(clientsData);
    }
  };

  const handleClientSelect = async (clientId: string) => {
    setSelectedClient(clientId);
    
    if (clientId === "manual") {
      onUpdate({
        client_id: undefined,
        client_name: "",
        client_cpf_cnpj: "",
        client_address: "",
        client_city: "",
        client_state: "",
        client_phone: "",
        client_email: "",
      });
      return;
    }

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (client) {
      onUpdate({
        client_id: client.id,
        client_name: client.name,
        client_phone: client.contact || "",
        client_cpf_cnpj: "",
        client_address: "",
        client_city: "",
        client_state: "",
        client_email: "",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Selecione um Cliente ou Preencha Manualmente</Label>
        <Select value={selectedClient} onValueChange={handleClientSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um cliente existente ou preencha manualmente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Preencher Manualmente
              </span>
            </SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client_name">Nome Completo / Razão Social *</Label>
          <Input
            id="client_name"
            value={data.client_name || ""}
            onChange={(e) => onUpdate({ client_name: e.target.value })}
            placeholder="Nome do cliente"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_cpf_cnpj">CPF / CNPJ *</Label>
          <Input
            id="client_cpf_cnpj"
            value={data.client_cpf_cnpj || ""}
            onChange={(e) => onUpdate({ client_cpf_cnpj: e.target.value })}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="client_address">Endereço Completo</Label>
          <Input
            id="client_address"
            value={data.client_address || ""}
            onChange={(e) => onUpdate({ client_address: e.target.value })}
            placeholder="Rua, número, complemento"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_city">Cidade</Label>
          <Input
            id="client_city"
            value={data.client_city || ""}
            onChange={(e) => onUpdate({ client_city: e.target.value })}
            placeholder="Cidade"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_state">Estado</Label>
          <Input
            id="client_state"
            value={data.client_state || ""}
            onChange={(e) => onUpdate({ client_state: e.target.value })}
            placeholder="UF"
            maxLength={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_phone">Telefone</Label>
          <Input
            id="client_phone"
            value={data.client_phone || ""}
            onChange={(e) => onUpdate({ client_phone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_email">E-mail</Label>
          <Input
            id="client_email"
            type="email"
            value={data.client_email || ""}
            onChange={(e) => onUpdate({ client_email: e.target.value })}
            placeholder="cliente@email.com"
          />
        </div>
      </div>
    </div>
  );
}
