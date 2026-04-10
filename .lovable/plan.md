

# Organizar cards de integrações por categoria

## Alteração em `src/pages/Settings.tsx` (linhas 410-416)

Substituir a grid única por seções com título e separador:

### Categorias:
1. **Marketing e Tráfego** — Meta Ads (Facebook)
2. **Produtividade** — Google Calendar
3. **Comunicação** — WhatsApp
4. **Gateways de Pagamento** — Asaas, Conexa

### Estrutura para cada categoria:
```
<div>
  <h3 className="text-lg font-semibold">Título da Categoria</h3>
  <p className="text-sm text-muted-foreground mb-4">Descrição curta</p>
  <Separator className="mb-4" />
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {cards}
  </div>
</div>
```

- Categorias com apenas 1 card usam grid normalmente (card ocupa metade)
- Categorias com 2 cards ficam lado a lado
- Cards admin-only mantêm `{isAgencyAdmin && ...}`
- Separação visual entre categorias via `space-y-8` no container pai

## Arquivo modificado (1)
- `src/pages/Settings.tsx`

