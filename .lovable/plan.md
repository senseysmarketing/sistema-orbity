

# Reativar Timeline no detalhe do cliente

## Diagnóstico
A timeline **não foi apagada**. O componente `src/components/clients/ClientTimeline.tsx` (lê/escreve em `client_notes`, com tipos: nota, ligação, e-mail, reunião, ideia, alerta) ainda existe e está totalmente funcional. Apenas deixou de ser renderizado em `src/pages/ClientDetail.tsx`.

## Mudança
Reinserir `<ClientTimeline />` como **primeira seção** da coluna esquerda (acima de "Próximas Tarefas").

### `src/pages/ClientDetail.tsx`
1. Adicionar import: `import { ClientTimeline } from "@/components/clients/ClientTimeline";`
2. Na coluna esquerda (linha ~568), inserir antes do bloco "Próximas Tarefas":
   ```tsx
   <div className="bg-white border rounded-xl shadow-sm p-4">
     <div className="flex items-center gap-2 mb-3">
       <MessageSquare className="h-4 w-4 text-muted-foreground" />
       <h3 className="text-sm font-semibold text-muted-foreground">
         Linha do Tempo
       </h3>
     </div>
     {id && <ClientTimeline clientId={id} />}
   </div>
   ```
3. Adicionar `MessageSquare` aos imports do `lucide-react`.

## Resultado
- Timeline volta como **primeira seção** da coluna principal.
- Permite registrar notas, ligações, e-mails, reuniões, ideias e alertas com autor, tipo e timestamp.
- Sem migration (tabela `client_notes` já existe e é usada pelo componente).

## Ficheiro alterado
- `src/pages/ClientDetail.tsx` (1 import + 1 bloco JSX)

