

# Plano: Sistema de Tipos de Tarefas

## Resumo

Implementar um sistema de "Tipos de Tarefas" que permite categorizar tarefas (ex: "Reunião", "Design", "Desenvolvimento", "Suporte"), com tipos padrão do sistema e personalização pela agência. O tipo será um campo obrigatório na criação de tarefas e ficará visível no Kanban.

---

## Tipos Padrão Sugeridos

| Slug | Nome | Ícone |
|------|------|-------|
| `reuniao` | Reunião | 📅 |
| `design` | Design | 🎨 |
| `desenvolvimento` | Desenvolvimento | 💻 |
| `conteudo` | Conteúdo | ✍️ |
| `suporte` | Suporte | 🛠️ |
| `administrativo` | Administrativo | 📋 |

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│                      Frontend                                │
├─────────────────────────────────────────────────────────────┤
│  Tasks.tsx                                                   │
│  ├── Campo "Tipo" obrigatório no form de criação/edição     │
│  ├── Exibição do tipo no card de tarefa (Kanban)            │
│  └── Filtro por tipo                                         │
├─────────────────────────────────────────────────────────────┤
│  TaskTypeManager.tsx (nova aba "Tipos" nas configurações)   │
│  ├── Lista de tipos padrão (toggle ativar/desativar)        │
│  ├── Criação de tipos personalizados                         │
│  └── Exclusão de tipos personalizados                        │
├─────────────────────────────────────────────────────────────┤
│  useTaskTypes.tsx (novo hook)                                │
│  └── Busca, criação, atualização e exclusão de tipos        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Supabase)                      │
├─────────────────────────────────────────────────────────────┤
│  task_types (nova tabela)                                    │
│  ├── id, agency_id, slug, name, icon                         │
│  ├── is_default, is_active                                   │
│  └── created_at                                              │
├─────────────────────────────────────────────────────────────┤
│  tasks (coluna nova)                                         │
│  └── task_type: string (slug do tipo)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### Etapa 1: Banco de Dados

**1.1. Criar tabela `task_types`**

```sql
CREATE TABLE public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- RLS
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task types of their agency"
  ON public.task_types FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage task types of their agency"
  ON public.task_types FOR ALL
  USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));
```

**1.2. Adicionar coluna `task_type` na tabela `tasks`**

```sql
ALTER TABLE public.tasks
ADD COLUMN task_type TEXT;

-- Opcional: definir um valor padrão para tarefas existentes
UPDATE public.tasks SET task_type = 'administrativo' WHERE task_type IS NULL;
```

---

### Etapa 2: Hook `useTaskTypes`

Criar `src/hooks/useTaskTypes.tsx` seguindo o padrão de `useTaskStatuses`:

- Buscar tipos do banco (ativos)
- Mesclar com tipos padrão do sistema
- Funções: `getTypeName(slug)`, `getTypeIcon(slug)`, `isValidType(slug)`
- Inicialização automática dos tipos padrão no banco quando a agência ainda não tem

---

### Etapa 3: Componente `TaskTypeManager`

Criar `src/components/tasks/TaskTypeManager.tsx` seguindo o padrão de `ContentTypeManager`:

- Card com título "Tipos de Tarefas"
- Lista de tipos padrão com toggle ativar/desativar
- Formulário para criar tipos personalizados (nome + ícone)
- Botão de exclusão para tipos personalizados
- Não permitir exclusão de tipos padrão

---

### Etapa 4: Integração na Página de Tarefas

**4.1. Aba de Configurações**

Adicionar nova aba "Tipos" no menu de configurações (junto com Templates e Status):

```tsx
<TabsTrigger value="types" className="flex items-center gap-2">
  <Tag className="h-4 w-4" />
  Tipos
</TabsTrigger>
<TabsContent value="types">
  <TaskTypeManager />
</TabsContent>
```

**4.2. Formulário de Criação/Edição**

Adicionar campo obrigatório "Tipo" no formulário:

```tsx
<div className="grid gap-2">
  <Label htmlFor="task_type">Tipo *</Label>
  <Select
    value={newTask.task_type}
    onValueChange={(value) => setNewTask({ ...newTask, task_type: value })}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione o tipo" />
    </SelectTrigger>
    <SelectContent>
      {types.map((type) => (
        <SelectItem key={type.slug} value={type.slug}>
          {type.icon} {type.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**4.3. Validação**

Bloquear criação se `task_type` não estiver selecionado:

```tsx
if (!newTask.task_type) {
  toast({
    title: "Erro",
    description: "O tipo da tarefa é obrigatório.",
    variant: "destructive",
  });
  return;
}
```

**4.4. Exibição no Card do Kanban**

Mostrar badge com ícone e nome do tipo no `SortableTaskCard`:

```tsx
<Badge variant="outline" className="text-xs">
  {getTypeIcon(task.task_type)} {getTypeName(task.task_type)}
</Badge>
```

**4.5. Filtro por Tipo**

Adicionar novo filtro na barra de filtros:

```tsx
<Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectTrigger className="w-40">
    <SelectValue placeholder="Tipo" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos os tipos</SelectItem>
    {types.map((type) => (
      <SelectItem key={type.slug} value={type.slug}>
        {type.icon} {type.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

### Etapa 5: Atualizar Templates de Tarefas

**5.1. Adicionar campo `default_task_type` na tabela `task_templates`**

```sql
ALTER TABLE public.task_templates
ADD COLUMN default_task_type TEXT;
```

**5.2. Atualizar `TaskTemplateForm`**

Adicionar seletor de tipo padrão no formulário de templates para que templates possam definir um tipo.

**5.3. Aplicar tipo do template**

Quando um template for aplicado, preencher automaticamente o tipo da tarefa.

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx.sql` | Criar tabela `task_types` e coluna em `tasks` |
| `src/integrations/supabase/types.ts` | Regenerar tipos (automático) |
| `src/hooks/useTaskTypes.tsx` | Criar novo hook |
| `src/components/tasks/TaskTypeManager.tsx` | Criar novo componente |
| `src/pages/Tasks.tsx` | Adicionar aba, campo no form, filtro, exibição |
| `src/components/ui/sortable-task-card.tsx` | Exibir badge do tipo |
| `src/components/tasks/TaskDetailsDialog.tsx` | Exibir tipo nos detalhes |
| `src/hooks/useTaskTemplates.tsx` | Adicionar `default_task_type` |
| `src/components/templates/TaskTemplateForm.tsx` | Adicionar seletor de tipo |

---

## Considerações

1. **Retrocompatibilidade**: Tarefas existentes ficarão com `task_type = NULL`. O sistema deve tratar isso graciosamente, exibindo "Sem tipo" ou ocultando o badge.

2. **Ordem de implementação sugerida**:
   - Migration do banco
   - Hook `useTaskTypes`
   - Componente `TaskTypeManager`
   - Integração no formulário de criação
   - Exibição no Kanban
   - Filtro
   - Templates

3. **UX**: O campo será obrigatório para novas tarefas, mas tarefas antigas sem tipo continuarão funcionando normalmente.

