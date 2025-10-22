import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReminderLists, ReminderList } from '@/hooks/useReminderLists';
import { useToast } from '@/hooks/use-toast';

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_OPTIONS = ['📋', '📝', '✅', '🎯', '🏠', '💼', '🛒', '💪', '📚', '🎨', '🎵', '🌟', '💡', '🔥', '⚡'];
const COLOR_OPTIONS = [
  { value: 'bg-blue-500', label: 'Azul' },
  { value: 'bg-red-500', label: 'Vermelho' },
  { value: 'bg-green-500', label: 'Verde' },
  { value: 'bg-yellow-500', label: 'Amarelo' },
  { value: 'bg-purple-500', label: 'Roxo' },
  { value: 'bg-pink-500', label: 'Rosa' },
  { value: 'bg-orange-500', label: 'Laranja' },
  { value: 'bg-teal-500', label: 'Azul-verde' },
];

export function CreateListDialog({ open, onOpenChange }: CreateListDialogProps) {
  const { createList } = useReminderLists();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [selectedColor, setSelectedColor] = useState('bg-blue-500');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a lista.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createList({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });

      toast({
        title: "Lista criada",
        description: "Sua lista foi criada com sucesso!",
      });

      // Reset form
      setName('');
      setSelectedIcon('📋');
      setSelectedColor('bg-blue-500');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar lista",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Lista</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Lista *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Trabalho, Pessoal, Compras..."
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label>Ícone</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`
                    text-2xl p-3 rounded-lg border-2 transition-all
                    ${selectedIcon === icon 
                      ? 'border-primary bg-primary/10 scale-110' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  disabled={loading}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Cor</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`
                    p-3 rounded-lg border-2 transition-all flex items-center gap-2
                    ${selectedColor === color.value 
                      ? 'border-primary scale-105' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                  disabled={loading}
                >
                  <div className={`w-4 h-4 rounded-full ${color.value}`} />
                  <span className="text-xs">{color.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Lista'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
