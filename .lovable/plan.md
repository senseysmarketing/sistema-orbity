

# Adicionar mais links de navegação ao Header

## Situação atual
O header possui 3 links: **Funcionalidades** (`#features`), **Preços** (`#pricing`), **FAQ** (`#faq`).

Secções disponíveis na landing page sem link no header: Demo, Integrações, Diferenciais.

## Alterações

### 1. `src/components/landing/LandingHeader.tsx` — Expandir `navLinks`
Adicionar novos itens ao array `navLinks`:
```
{ label: "Funcionalidades", href: "#features" },
{ label: "Integrações", href: "#integrations" },
{ label: "Diferenciais", href: "#differentials" },
{ label: "Preços", href: "#pricing" },
{ label: "FAQ", href: "#faq" },
```

### 2. Adicionar `id` às secções que ainda não têm

- **`IntegrationsSection.tsx`** — adicionar `id="integrations"` ao `<section>`
- **`DifferentialsSection.tsx`** — adicionar `id="differentials"` ao `<section>`

### Ficheiros alterados
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/IntegrationsSection.tsx`
- `src/components/landing/DifferentialsSection.tsx`

