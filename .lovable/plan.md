

# Limitar altura de notas + scroll vertical na timeline

## Mudanças em `src/components/clients/ClientTimeline.tsx`

### 1. Notas longas: "Ver mais / Ver menos"
- Criar componente interno `NoteContent` que recebe `content`.
- Estado local `expanded` (default `false`).
- Se `content.length > 280` (ou `> 6` quebras de linha): renderizar com `max-h-32 overflow-hidden` + gradiente de fade no fim, mais botão `Ver mais`.
- Quando expandido: mostrar tudo + botão `Ver menos`.
- Botão estilo `variant="link" size="sm"` discreto.

```tsx
const LIMIT = 280;
const isLong = content.length > LIMIT || content.split('\n').length > 6;
const [expanded, setExpanded] = useState(false);

<div className={cn("relative", !expanded && isLong && "max-h-32 overflow-hidden")}>
  <p className="text-sm whitespace-pre-wrap">{content}</p>
  {!expanded && isLong && (
    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
  )}
</div>
{isLong && (
  <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1"
    onClick={() => setExpanded(!expanded)}>
    {expanded ? "Ver menos" : "Ver mais"}
  </Button>
)}
```

### 2. Scroll vertical na timeline
- Envolver a lista de notas (o `<div className="relative">` que contém a linha + os cards) num container com `max-h-[600px] overflow-y-auto pr-2`.
- O formulário de adicionar nota (Card no topo) **fica fora** do scroll para sempre estar acessível.
- Vazio state também fora do scroll.

### 3. Ajuste menor
- Adicionar import `cn` de `@/lib/utils`.

## Resultado
- Notas longas mostram preview de ~5 linhas com gradiente + "Ver mais".
- Lista da timeline tem altura máxima de 600px com scroll interno.
- Formulário de criação sempre visível no topo.

## Ficheiro alterado
- `src/components/clients/ClientTimeline.tsx` (1 import + componente `NoteContent` + wrapper de scroll)

Sem migration. Sem mudanças em queries.

