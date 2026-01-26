import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Tag } from "lucide-react";
import { useTaskTypes } from "@/hooks/useTaskTypes";

const TYPE_ICONS = [
  "📋", "📅", "🎨", "💻", "✍️", "🛠️", "📊", "📁",
  "🚀", "💼", "🎯", "📌", "⭐", "🔥", "💡", "📝",
];

export function TaskTypeManager() {
  const {
    types,
    defaultTypes,
    isLoading,
    initializeDefaultTypes,
    createType,
    updateType,
    deleteType,
  } = useTaskTypes();

  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeIcon, setNewTypeIcon] = useState("📋");
  const [isCreating, setIsCreating] = useState(false);

  // Inicializar tipos padrão quando necessário
  useEffect(() => {
    if (!isLoading && types.length === 0) {
      initializeDefaultTypes();
    }
  }, [isLoading, types.length, initializeDefaultTypes]);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) return;

    setIsCreating(true);
    try {
      await createType({ name: newTypeName.trim(), icon: newTypeIcon });
      setNewTypeName("");
      setNewTypeIcon("📋");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleType = async (id: string, currentActive: boolean) => {
    await updateType({ id, is_active: !currentActive });
  };

  const handleDeleteType = async (id: string) => {
    await deleteType(id);
  };

  // Separar tipos padrão e personalizados
  const defaultTypesInDb = types.filter((t) => t.is_default);
  const customTypesInDb = types.filter((t) => !t.is_default);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Tipos de Tarefas
        </CardTitle>
        <CardDescription>
          Gerencie os tipos de tarefas disponíveis. Tipos padrão podem ser ativados/desativados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tipos Padrão */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Tipos Padrão do Sistema</h4>
          <div className="space-y-3">
            {(defaultTypesInDb.length > 0 ? defaultTypesInDb : defaultTypes.map((t, i) => ({
              ...t,
              id: `temp-${i}`,
              agency_id: "",
              created_at: "",
              is_active: true,
            }))).map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{type.icon}</span>
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-xs text-muted-foreground">/{type.slug}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                </div>
                {!type.id.startsWith("temp-") && (
                  <Switch
                    checked={type.is_active}
                    onCheckedChange={() => handleToggleType(type.id, type.is_active)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Tipos Personalizados */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Tipos Personalizados</h4>
          
          {customTypesInDb.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhum tipo personalizado criado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {customTypesInDb.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{type.icon}</span>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-xs text-muted-foreground">/{type.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={type.is_active}
                      onCheckedChange={() => handleToggleType(type.id, type.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteType(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Formulário de Criação */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Criar Novo Tipo</h4>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="type-name">Nome do Tipo</Label>
              <Input
                id="type-name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ex: Marketing"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreateType();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {TYPE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewTypeIcon(icon)}
                    className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                      newTypeIcon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreateType}
              disabled={!newTypeName.trim() || isCreating}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Tipo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
