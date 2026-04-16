

# Refatoração Técnica do Módulo de Tarefas

## Resumo
Três melhorias cirúrgicas: query paralela com filtro temporal, formulário com RHF+Zod, e toast de erro no optimistic UI das subtarefas.

---

## Passo 1: Performance — Query paralela com `Promise.all`

**Ficheiro:** `src/pages/Tasks.tsx` — função `fetchTasks` (linhas 229-285)

Substituir a query única por duas queries paralelas via `Promise.all`:

```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const [openResult, doneResult] = await Promise.all([
  supabase
    .from("tasks")
    .select("*, task_clients(client_id), task_assignments(user_id)")
    .eq("agency_id", currentAgency.id)
    .eq("archived", false)
    .neq("status", "done")
    .order("created_at", { ascending: false })
    .limit(300),
  supabase
    .from("tasks")
    .select("*, task_clients(client_id), task_assignments(user_id)")
    .eq("agency_id", currentAgency.id)
    .eq("archived", false)
    .eq("status", "done")
    .gte("updated_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50),
]);

if (openResult.error) throw openResult.error;
if (doneResult.error) throw doneResult.error;

const rawTasks = [...(openResult.data || []), ...(doneResult.data || [])];
```

O restante da lógica de enrichment (profiles, `_assignedUsers`) permanece idêntico, apenas opera sobre o array `rawTasks` combinado.

---

## Passo 2: Estabilidade — React Hook Form + Zod

**Ficheiro:** `src/pages/Tasks.tsx`

### 2a. Schema Zod defensivo (novo bloco no topo do ficheiro)
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const taskFormSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().nullable().optional().default(""),
  status: z.string().default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z.string().default("unassigned"),
  assigned_users: z.array(z.string()).default([]),
  client_ids: z.array(z.string()).default([]),
  due_date: z.string().nullable().optional().default(""),
  subtasks: z.array(z.any()).default([]),
  attachments: z.array(z.any()).default([]),
  task_type: z.string().min(1, "Tipo obrigatório"),
  platform: z.string().nullable().optional().default(""),
  post_type: z.string().nullable().optional().default(""),
  post_date: z.string().nullable().optional().default(""),
  hashtags: z.string().nullable().optional().default(""),
  creative_instructions: z.string().nullable().optional().default(""),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;
```

Todos os campos opcionais usam `.nullable().optional().default()` para segurança máxima com dados nulos do Supabase.

### 2b. Substituir `newTask` / `setNewTask` por `useForm`
- Remover o `useState` de `newTask` (linhas 142-176)
- Adicionar dentro do componente:
```typescript
const form = useForm<TaskFormValues>({
  resolver: zodResolver(taskFormSchema),
  defaultValues: { title: "", description: "", status: "todo", priority: "medium", ... }
});
```
- Nos inputs, substituir `value={newTask.title}` por `{...form.register("title")}` para campos simples
- Para Select, MultiUserSelector, MultiClientSelector, SubtaskManager, FileAttachments — usar `form.watch()` + `form.setValue()`
- `handleCreateTask` e `handleUpdateTask` passam a usar `form.handleSubmit(onSubmit)`
- Validação nativa do Zod elimina os checks manuais de `title.trim()` e `task_type`

### 2c. AI Prefill com `setValue` (Guardrail 3)
Na callback do AI (linhas 1066-1079), substituir `setNewTask((prev) => ...)` por iteração com `setValue`:
```typescript
if (result.title) form.setValue("title", result.title, { shouldValidate: true });
if (result.description) form.setValue("description", result.description, { shouldValidate: true });
if (result.priority) form.setValue("priority", result.priority, { shouldValidate: true });
if (result.suggested_type) form.setValue("task_type", result.suggested_type, { shouldValidate: true });
// ... mesma lógica para client_ids, assigned_users, due_date, platform, etc.
```

### 2d. Templates com `setValue` também
Na função `applyTemplate` (linhas 625-672), substituir `setNewTask({...})` por iteração com `setValue` sobre cada campo do template, preservando campos já preenchidos pelo utilizador.

### 2e. handleEditTask com `form.reset`
Na função `handleEditTask` (linha 674), usar `form.reset(values)` pois é abertura de edição (não há dados do utilizador a preservar).

### 2f. Dialog onOpenChange
Ao abrir o dialog de criação (linhas 988-999), usar `form.reset(defaultValues)` pois é criação nova.

---

## Passo 3: Toast de erro no Optimistic UI das subtarefas

**Ficheiro:** `src/components/tasks/TaskDetailsDialog.tsx` — função `handleToggleSubtask` (linhas 139-161)

Adicionar toast de erro no bloco catch:
```typescript
} catch (error) {
  console.error("Error updating subtask:", error);
  setSubtasks(subtasks); // já existe — reversão
  toast({
    title: "Erro ao atualizar subtarefa",
    description: "Tente novamente.",
    variant: "destructive",
  });
}
```

---

## Ficheiros alterados
1. `src/pages/Tasks.tsx` — query paralela + formulário RHF/Zod + setValue para AI/Templates
2. `src/components/tasks/TaskDetailsDialog.tsx` — toast de erro no optimistic UI

## Guardrails respeitados
- `Promise.all` para paralelismo (Guardrail 1)
- `.nullable().optional().default()` em todos campos opcionais (Guardrail 2)
- `setValue` em vez de `reset` para AI Prefill e Templates (Guardrail 3)
- dnd-kit intocado
- Todos os campos existentes preservados no schema

