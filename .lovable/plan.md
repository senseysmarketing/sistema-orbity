

# Converter ClientDetail.tsx para Light Mode

## Situação atual
A página de detalhes do cliente usa tema escuro (`bg-slate-950`, `text-white`, `bg-white/5`) que destoa das demais telas internas do sistema que usam fundo claro (`bg-slate-50`, cores padrão do shadcn).

## Alteração

**Ficheiro:** `src/pages/ClientDetail.tsx` — converter todas as classes dark para light mode consistente com o resto do sistema.

### Mapeamento de cores:

| Dark (atual) | Light (novo) |
|---|---|
| `bg-gradient-to-br from-slate-950 via-purple-950/30 to-slate-950` | removido (fundo padrão da página) |
| `-m-6 p-6 min-h-screen text-white` | `space-y-6` |
| `bg-white/5 border-white/10` | `bg-white border rounded-xl shadow-sm` |
| `text-white/60`, `text-white/50`, `text-white/40`, `text-white/30` | `text-muted-foreground` |
| `text-white`, `text-white/70`, `text-white/80` | texto padrão (remove classe) |
| `hover:bg-white/10` | `hover:bg-slate-50` |
| `bg-purple-500/20 text-purple-300 border-purple-500/30` (avatar) | `bg-purple-100 text-purple-700 border-purple-200` |
| `bg-purple-500/10 border-purple-500/20` (AI summary) | `bg-purple-50 border-purple-200` |
| `text-purple-300/400` | `text-purple-600` |
| `bg-emerald-500/20 text-emerald-300` (badge) | `bg-emerald-100 text-emerald-700 border-emerald-200` |
| `bg-slate-500/20 text-slate-400` | `bg-slate-100 text-slate-600` |
| Priority badges dark variants | Light variants (`bg-red-100 text-red-700`, etc.) |
| Meeting status dark variants | Light variants |
| Skeleton `bg-white/10`, `bg-white/5` | Skeleton padrão (sem classe extra) |
| Botão Drive `border-white/20 text-white/80` | `variant="outline"` padrão |
| Vault/cred items `bg-white/5` | `bg-slate-50` |
| Creative placeholder `bg-white/5` | `bg-slate-100` |
| `text-white` no header | removido |

### Botão WhatsApp e Drive
- WhatsApp mantém `bg-emerald-600`
- Drive usa `variant="outline"` padrão sem classes custom

### Loading skeleton
- Remove `bg-gradient` do container, usa skeleton padrão

## Ficheiros alterados
1. `src/pages/ClientDetail.tsx` — reescrita de todas as classes para light mode

## Guardrails
- Nenhuma alteração na lógica, queries ou estrutura do Bento Grid
- Apenas classes CSS/Tailwind são alteradas
- Layout e ordem mobile/desktop preservados

