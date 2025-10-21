import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

const platforms = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter" },
];

const defaultTimes = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00"
];

export function SchedulePreferencesManager() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newPref, setNewPref] = useState({
    client_id: "",
    platform: "instagram",
    preferred_times: [] as string[],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", currentAgency?.id)
        .eq("active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const { data: preferences = [] } = useQuery({
    queryKey: ["schedule-preferences", currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_media_schedule_preferences")
        .select(`
          *,
          clients(name)
        `)
        .eq("agency_id", currentAgency?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("social_media_schedule_preferences")
        .insert({
          agency_id: currentAgency?.id,
          client_id: newPref.client_id || null,
          platform: newPref.platform,
          preferred_times: newPref.preferred_times,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-preferences"] });
      setNewPref({
        client_id: "",
        platform: "instagram",
        preferred_times: [],
      });
      setShowForm(false);
      toast.success("Preferência salva");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_media_schedule_preferences")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-preferences"] });
      toast.success("Preferência removida");
    },
  });

  const toggleTime = (time: string) => {
    setNewPref(prev => ({
      ...prev,
      preferred_times: prev.preferred_times.includes(time)
        ? prev.preferred_times.filter(t => t !== time)
        : [...prev.preferred_times, time].sort()
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Horários Padrão de Postagem</CardTitle>
            <CardDescription>
              Defina horários preferidos por cliente e plataforma
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Preferência
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Cliente (Opcional)</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newPref.client_id}
                  onChange={(e) => setNewPref({ ...newPref, client_id: e.target.value })}
                >
                  <option value="">Padrão para todos</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Plataforma</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3"
                  value={newPref.platform}
                  onChange={(e) => setNewPref({ ...newPref, platform: e.target.value })}
                >
                  {platforms.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Horários Preferidos</Label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {defaultTimes.map(time => (
                  <Button
                    key={time}
                    type="button"
                    variant={newPref.preferred_times.includes(time) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTime(time)}
                    className="w-full"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {time}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={newPref.preferred_times.length === 0}
              >
                Salvar Preferência
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {preferences.map((pref: any) => (
            <div
              key={pref.id}
              className="p-3 border rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="font-medium">
                      {platforms.find(p => p.value === pref.platform)?.label}
                    </span>
                    {pref.clients && (
                      <span className="text-sm text-muted-foreground">
                        • {pref.clients.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {pref.preferred_times.map((time: string, i: number) => (
                      <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(pref.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}