import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Settings, Palette, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface CustomStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  is_default: boolean;
}

interface CustomStatusManagerProps {
  onStatusUpdate?: () => void;
}

const defaultColors = [
  { name: 'Azul', value: 'bg-blue-500' },
  { name: 'Verde', value: 'bg-green-500' },
  { name: 'Amarelo', value: 'bg-yellow-500' },
  { name: 'Laranja', value: 'bg-orange-500' },
  { name: 'Roxo', value: 'bg-purple-500' },
  { name: 'Rosa', value: 'bg-pink-500' },
  { name: 'Vermelho', value: 'bg-red-500' },
  { name: 'Índigo', value: 'bg-indigo-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Cinza', value: 'bg-gray-500' },
];

const defaultStatuses = [
  { name: 'Novo', color: 'bg-blue-500', is_default: true, order: 1 },
  { name: 'Contatado', color: 'bg-yellow-500', is_default: true, order: 2 },
  { name: 'Qualificado', color: 'bg-orange-500', is_default: true, order: 3 },
  { name: 'Proposta', color: 'bg-purple-500', is_default: true, order: 4 },
  { name: 'Negociação', color: 'bg-indigo-500', is_default: true, order: 5 },
  { name: 'Ganho', color: 'bg-green-500', is_default: true, order: 6 },
  { name: 'Perdido', color: 'bg-red-500', is_default: true, order: 7 },
];

export function CustomStatusManager({ onStatusUpdate }: CustomStatusManagerProps) {
  const { currentAgency } = useAgency();
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: 'bg-blue-500',
  });

  const fetchStatuses = async () => {
    if (!currentAgency?.id) return;

    try {
      const { data, error } = await supabase
        .from('lead_statuses')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('order');

      if (error) throw error;

      if (!data || data.length === 0) {
        // Initialize with default statuses
        await initializeDefaultStatuses();
        return;
      }

      setStatuses(data as CustomStatus[]);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      toast.error('Erro ao carregar status');
    }
  };

  const initializeDefaultStatuses = async () => {
    if (!currentAgency?.id) return;

    try {
      const statusesToInsert = defaultStatuses.map(status => ({
        ...status,
        agency_id: currentAgency.id,
        id: crypto.randomUUID(),
      }));

      const { error } = await supabase
        .from('lead_statuses')
        .insert(statusesToInsert);

      if (error) throw error;
      
      fetchStatuses();
    } catch (error) {
      console.error('Error initializing default statuses:', error);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [currentAgency?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgency?.id) return;

    setLoading(true);

    try {
      if (editingStatus) {
        // Update existing status
        const { error } = await supabase
          .from('lead_statuses')
          .update({
            name: formData.name,
            color: formData.color,
          })
          .eq('id', editingStatus.id);

        if (error) throw error;
        toast.success('Status atualizado com sucesso');
      } else {
        // Create new status
        const maxOrder = Math.max(...statuses.map(s => s.order), 0);
        const { error } = await supabase
          .from('lead_statuses')
          .insert({
            agency_id: currentAgency.id,
            name: formData.name,
            color: formData.color,
            order: maxOrder + 1,
            is_default: false,
          });

        if (error) throw error;
        toast.success('Status criado com sucesso');
      }

      setFormData({ name: '', color: 'bg-blue-500' });
      setEditingStatus(null);
      setShowForm(false);
      fetchStatuses();
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error saving status:', error);
      toast.error('Erro ao salvar status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (statusId: string) => {
    try {
      const { error } = await supabase
        .from('lead_statuses')
        .delete()
        .eq('id', statusId);

      if (error) throw error;
      
      toast.success('Status excluído com sucesso');
      fetchStatuses();
      onStatusUpdate?.();
    } catch (error) {
      console.error('Error deleting status:', error);
      toast.error('Erro ao excluir status');
    }
  };

  const handleEdit = (status: CustomStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      color: status.color,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', color: 'bg-blue-500' });
    setEditingStatus(null);
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Status Personalizados do Pipeline
          </CardTitle>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStatus ? 'Editar Status' : 'Novo Status'}
                </DialogTitle>
                <DialogDescription>
                  {editingStatus 
                    ? 'Edite as informações do status personalizado'
                    : 'Crie um novo status para o pipeline de leads'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Status</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Aguardando Aprovação"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Cor</Label>
                  <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultColors.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${color.value}`}></div>
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-6 h-6 rounded-full ${formData.color}`}></div>
                    <span className="text-sm text-muted-foreground">Prévia da cor</span>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Salvando...' : (editingStatus ? 'Atualizar' : 'Criar')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statuses.map((status) => (
            <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${status.color}`}></div>
                <div>
                  <span className="font-medium">{status.name}</span>
                  {status.is_default && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Padrão
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(status)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {!status.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(status.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {statuses.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p>Nenhum status configurado ainda</p>
              <p className="text-sm">Clique em "Novo Status" para começar</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}