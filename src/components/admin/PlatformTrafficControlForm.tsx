import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
}

interface PlatformData {
  platform: string;
  daily_budget: number | null;
  situation: 'stable' | 'improving' | 'worsening' | null;
  results: 'excellent' | 'good' | 'average' | 'bad' | 'terrible' | null;
  last_optimization: string | null;
}

interface PlatformTrafficControlFormProps {
  onSuccess: () => void;
}

export function PlatformTrafficControlForm({ onSuccess }: PlatformTrafficControlFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [observations, setObservations] = useState("");
  const [platforms, setPlatforms] = useState<PlatformData[]>([
    {
      platform: "",
      daily_budget: null,
      situation: null,
      results: null,
      last_optimization: null
    }
  ]);

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
    setPlatforms([...platforms, {
      platform: "",
      daily_budget: null,
      situation: null,
      results: null,
      last_optimization: null
    }]);
  };

  const removePlatform = (index: number) => {
    if (platforms.length > 1) {
      setPlatforms(platforms.filter((_, i) => i !== index));
    }
  };

  const updatePlatform = (index: number, field: keyof PlatformData, value: any) => {
    const newPlatforms = [...platforms];
    newPlatforms[index] = { ...newPlatforms[index], [field]: value };
    setPlatforms(newPlatforms);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId) {
      toast({
        title: "Erro",
        description: "Selecione um cliente",
        variant: "destructive",
      });
      return;
    }

    const validPlatforms = platforms.filter(p => p.platform.trim() !== "");
    if (validPlatforms.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos uma plataforma",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Criar estrutura de dados por plataforma
      const platformData: Record<string, any> = {};
      const platformsList: string[] = [];

      validPlatforms.forEach(platform => {
        platformsList.push(platform.platform);
        platformData[platform.platform] = {
          daily_budget: platform.daily_budget,
          situation: platform.situation,
          results: platform.results,
          last_optimization: platform.last_optimization
        };
      });

      const { error } = await supabase
        .from('traffic_controls')
        .insert({
          client_id: clientId,
          platforms: platformsList,
          platform_data: platformData,
          observations: observations || null,
        });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Controle de tráfego criado com sucesso.",
      });

      // Reset form
      setClientId("");
      setObservations("");
      setPlatforms([{
        platform: "",
        daily_budget: null,
        situation: null,
        results: null,
        last_optimization: null
      }]);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Controle de Tráfego por Plataforma</DialogTitle>
          <DialogDescription>
            Crie um controle de tráfego com informações específicas para cada plataforma.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="client">Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
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

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Plataformas</Label>
                <Button type="button" onClick={addPlatform} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Plataforma
                </Button>
              </div>

              {platforms.map((platform, index) => (
                <Card key={index} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">
                        Plataforma {index + 1}
                      </CardTitle>
                      {platforms.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removePlatform(index)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Nome da Plataforma *</Label>
                      <Input
                        placeholder="Ex: Meta Ads, Google Ads, TikTok Ads"
                        value={platform.platform}
                        onChange={(e) => updatePlatform(index, 'platform', e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Budget Diário (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={platform.daily_budget || ""}
                        onChange={(e) => updatePlatform(index, 'daily_budget', e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Situação</Label>
                        <Select 
                          value={platform.situation || ""} 
                          onValueChange={(value) => updatePlatform(index, 'situation', value as Database["public"]["Enums"]["traffic_situation"])}
                        >
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
                        <Label>Resultados</Label>
                        <Select 
                          value={platform.results || ""} 
                          onValueChange={(value) => updatePlatform(index, 'results', value as Database["public"]["Enums"]["traffic_result"])}
                        >
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
                      <Label>Última Otimização</Label>
                      <Input
                        type="date"
                        value={platform.last_optimization || ""}
                        onChange={(e) => updatePlatform(index, 'last_optimization', e.target.value || null)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observations">Observações Gerais</Label>
              <Textarea
                id="observations"
                placeholder="Adicione observações gerais sobre o controle de tráfego..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
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