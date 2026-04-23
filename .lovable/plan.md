

# Descrição colapsável no modal de detalhes da tarefa

## Problema

Tarefas com descrições longas (ex: roteiros de carrossel com vários slides, como mostra o screenshot) fazem o modal crescer verticalmente em centenas de pixels. O usuário precisa rolar muito para chegar nas seções abaixo (Anexos, Subtarefas, Histórico) e nos botões de ação.

## Solução

Adicionar um colapso elegante na seção **Descrição** dentro de `src/components/tasks/TaskDetailsDialog.tsx`. Quando a descrição for longa, ela aparece recolhida por padrão com um botão "Ver mais" / "Ver menos".

### Comportamento

- **Threshold**: descrições com mais de **240 caracteres** OU mais de **6 quebras de linha** entram em modo colapsável. Abaixo disso, renderiza completa (sem botão).
- **Estado inicial**: ao abrir o modal, a descrição vem **recolhida** (`isExpanded = false`).
- **Visual recolhido**: 
  - Container com `max-h-[180px] overflow-hidden relative`.
  - Gradiente de fade no rodapé (`bg-gradient-to-t from-background to-transparent h-12 absolute bottom-0`) para indicar continuação do conteúdo de forma sutil.
- **Botão**: `<Button variant="ghost" size="sm">` com ícone `ChevronDown` / `ChevronUp` e texto "Ver mais" / "Ver menos", abaixo do bloco. Posicionado à esquerda, padding mínimo, cor `text-primary`.
- **Reset**: ao trocar de tarefa (mudança de `task.id`), o estado volta a `false` via `useEffect`.

### Implementação técnica

1. Importar `ChevronDown`, `ChevronUp` de `lucide-react` (provavelmente já existem no arquivo).
2. Adicionar estado local: `const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);`
3. Adicionar `useEffect(() => setIsDescriptionExpanded(false), [task?.id]);` para resetar entre tarefas.
4. Calcular `const isLongDescription = task.description && (task.description.length > 240 || task.description.split('\n').length > 6);`
5. Envolver o bloco de descrição existente:
   ```tsx
   <div className={cn(
     "relative transition-all",
     isLongDescription && !isDescriptionExpanded && "max-h-[180px] overflow-hidden"
   )}>
     {/* conteúdo da descrição existente */}
     {isLongDescription && !isDescriptionExpanded && (
       <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
     )}
   </div>
   {isLongDescription && (
     <Button variant="ghost" size="sm" onClick={() => setIsDescriptionExpanded(v => !v)} className="mt-2 h-8 px-2 text-primary hover:text-primary">
       {isDescriptionExpanded ? <><ChevronUp className="h-4 w-4 mr-1" />Ver menos</> : <><ChevronDown className="h-4 w-4 mr-1" />Ver mais</>}
     </Button>
   )}
   ```

## Arquivo editado

- `src/components/tasks/TaskDetailsDialog.tsx` — único arquivo afetado.

## Sem mudanças

- Threshold é local — não vira config global.
- Demais seções do modal (Anexos, Subtarefas, Histórico, Aprovação) — preservadas.
- Comportamento mobile — mantém o mesmo colapso (na verdade ajuda ainda mais em telas pequenas).

