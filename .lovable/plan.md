

# Campo de Pesquisa no Select de Tarefas (Gerador de Legendas)

## Resumo

Substituir o `Select` atual de tarefas por um `Popover` + `Command` (cmdk) que permite pesquisar/filtrar tarefas por nome ou cliente digitando no campo de busca.

## Arquivo Modificado

### `src/components/social-media/CaptionGenerator.tsx`

- Importar `Popover`, `PopoverTrigger`, `PopoverContent` do radix
- Importar `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandItem` do cmdk
- Importar icones `Check` e `ChevronsUpDown` do lucide
- Adicionar estado `taskSearchOpen` (boolean) para controlar o popover
- Substituir o bloco `<Select>` de tarefas (linhas 262-276) por um Combobox:
  - `PopoverTrigger` mostra o titulo da tarefa selecionada ou placeholder
  - `CommandInput` com placeholder "Pesquisar tarefa..."
  - `CommandList` renderiza as tarefas filtradas automaticamente pelo cmdk
  - `CommandEmpty` mostra "Nenhuma tarefa encontrada"
  - Ao selecionar, seta `selectedTaskId` e fecha o popover

## Resultado

O usuario podera digitar para filtrar tarefas por titulo ou nome do cliente, facilitando a busca em listas longas.

