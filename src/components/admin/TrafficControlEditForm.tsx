import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
}

interface TrafficControl {
  id: string;
  client_id: string;
  platforms: string[] | null;
  daily_budget: number | null;
  situation: 'stable' | 'improving' | 'worsening' | null;
  results: 'excellent' | 'good' | 'average' | 'bad' | 'terrible' | null;
  last_optimization: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

interface TrafficControlEditFormProps {
  control: TrafficControl;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrafficControlEditForm({ control, onSuccess, onCancel }: TrafficControlEditFormProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(control.platforms || []);
  const [newPlatform, setNewPlatform] = useState("");
  const [formData, setFormData] = useState({
    client_id: control.client_id,
    daily_budget: control.daily_budget?.toString() || "",
    situation: control.situation as Database["public"]["Enums"]["traffic_situation"] | "",
    results: control.results as Database["public"]["Enums"]["traffic_result"] | "",
    last_optimization: control.last_optimization || "",
    observations: control.observations || "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, monthly_value, active')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addPlatform = () => {
    if (newPlatform.trim() && !platforms.includes(newPlatform.trim())) {
      setPlatforms([...platforms, newPlatform.trim()]);
      setNewPlatform("");
    }
  };

  const removePlatform = (platform: string) => {
    setPlatforms(platforms.filter(p => p !== platform));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('traffic_controls')
        .update({
          client_id: formData.client_id,
          platforms: platforms.length > 0 ? platforms : null,
          daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : null,
          situation: formData.situation || null,
          results: formData.results || null,
          last_optimization: formData.last_optimization || null,
          observations: formData.observations || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', control.id);

      if (error) throw error;

      toast({
        title: "Controle atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar controle",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="client">Cliente *</Label>
          <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Plataformas</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Facebook Ads, Google Ads"
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPlatform();
                }
              }}
            />
            <Button type="button" onClick={addPlatform} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {platforms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {platforms.map((platform, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  {platform}
                  <button
                    type="button"
                    onClick={() => removePlatform(platform)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="budget">Budget Diário (R$)</Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.daily_budget}
            onChange={(e) => setFormData(prev => ({ ...prev, daily_budget: e.target.value }))}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="situation">Situação</Label>
            <Select value={formData.situation} onValueChange={(value) => setFormData(prev => ({ ...prev, situation: value as Database["public"]["Enums"]["traffic_situation"] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stable">Estável</SelectItem>
                <SelectItem value="improving">Melhorando</SelectItem>
                <SelectItem value="worsening">Piorando</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="results">Resultados</Label>
            <Select value={formData.results} onValueChange={(value) => setFormData(prev => ({ ...prev, results: value as Database["public"]["Enums"]["traffic_result"] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione os resultados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excelentes</SelectItem>
                <SelectItem value="good">Bons</SelectItem>
                <SelectItem value="average">Médios</SelectItem>
                <SelectItem value="bad">Ruins</SelectItem>
                <SelectItem value="terrible">Péssimos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="optimization">Última Otimização</Label>
          <Input
            id="optimization"
            type="date"
            value={formData.last_optimization}
            onChange={(e) => setFormData(prev => ({ ...prev, last_optimization: e.target.value }))}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="observations">Observações</Label>
          <Textarea
            id="observations"
            placeholder="Adicione observações sobre as campanhas..."
            value={formData.observations}
            onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
            rows={3}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} variant="create">
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}