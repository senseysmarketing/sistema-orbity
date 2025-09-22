import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
}

interface TrafficControlFormProps {
  onSuccess: () => void;
}

export function TrafficControlForm({ onSuccess }: TrafficControlFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [newPlatform, setNewPlatform] = useState("");
  const [formData, setFormData] = useState({
    client_id: "",
    daily_budget: "",
    situation: "" as Database["public"]["Enums"]["traffic_situation"] | "",
    results: "" as Database["public"]["Enums"]["traffic_result"] | "",
    last_optimization: "",
    observations: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

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
    if (!formData.client_id) {
      toast({
        title: "Erro",
        description: "Selecione um cliente",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('traffic_controls')
        .insert({
          client_id: formData.client_id,
          platforms: platforms.length > 0 ? platforms : null,
          daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : null,
          situation: formData.situation || null,
          results: formData.results || null,
          last_optimization: formData.last_optimization || null,
          observations: formData.observations || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Controle de tráfego criado com sucesso.",
      });

      // Reset form
      setFormData({
        client_id: "",
        daily_budget: "",
        situation: "" as Database["public"]["Enums"]["traffic_situation"] | "",
        results: "" as Database["public"]["Enums"]["traffic_result"] | "",
        last_optimization: "",
        observations: "",
      });
      setPlatforms([]);
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao criar controle",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="create" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Controle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Controle de Tráfego</DialogTitle>
          <DialogDescription>
            Crie um novo controle de tráfego para gerenciar campanhas de um cliente.
          </DialogDescription>
        </DialogHeader>
        
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} variant="create">
              {loading ? "Criando..." : "Criar Controle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}