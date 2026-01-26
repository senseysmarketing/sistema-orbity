
# Plano: Adicionar Scroll Vertical ao Modal de Tarefas

## Problema

Quando o usuário adiciona anexos ou muitas subtarefas no modal de criação/edição de tarefas, o conteúdo cresce verticalmente e o botão "Criar Tarefa" / "Atualizar" desaparece abaixo da tela, impossibilitando salvar a tarefa.

## Solução

Adicionar um sistema de scroll vertical no conteúdo do modal, mantendo o cabeçalho (título) e rodapé (botões) sempre visíveis.

---

## Alterações Técnicas

### Arquivo: `src/pages/Tasks.tsx`

**1. Adicionar import do ScrollArea:**
```typescript
import { ScrollArea } from "@/components/ui/scroll-area";
```

**2. Modal de Criação (linhas ~835-978):**

Modificar a estrutura do DialogContent para:
- Adicionar `max-h-[90vh]` e `flex flex-col` ao DialogContent
- Envolver o conteúdo do formulário (`<div className="grid gap-4 py-4">`) em um `<ScrollArea>` com altura máxima
- DialogHeader e DialogFooter ficam fora do ScrollArea (sempre visíveis)

**Antes:**
```tsx
<DialogContent className="sm:max-w-[600px]">
  <DialogHeader>...</DialogHeader>
  <div className="grid gap-4 py-4">
    {/* todos os campos */}
  </div>
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

**Depois:**
```tsx
<DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
  <DialogHeader>...</DialogHeader>
  <ScrollArea className="flex-1 max-h-[60vh] pr-4">
    <div className="grid gap-4 py-4">
      {/* todos os campos */}
    </div>
  </ScrollArea>
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

**3. Modal de Edição (se houver - verificar linhas ~1186-1316):**

Aplicar a mesma estrutura de scroll ao modal de edição de tarefas.

---

## Comportamento Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Poucos campos preenchidos | Modal normal | Modal normal |
| Muitas subtarefas | Botão some da tela | Scroll aparece, botão visível |
| Anexos adicionados | Botão some da tela | Scroll aparece, botão visível |
| Tela pequena | Conteúdo cortado | Scroll funcional |

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Tasks.tsx` | Adicionar import de ScrollArea e aplicar scroll nos modais de criação e edição |

---

## Resultado Visual

- DialogHeader (título "Criar Nova Tarefa") sempre no topo
- Área de formulário com scroll quando necessário
- DialogFooter (botões "Cancelar" e "Criar Tarefa") sempre visíveis no rodapé
- Padding direito no ScrollArea para não cortar o scrollbar
