

# Adicionar fundo amarelo claro na logo do Conexa

## O que será feito
Adicionar uma classe de background amarelo claro (`bg-amber-50` ou `bg-yellow-100`) no container `div` que envolve a logo do Conexa, tanto na landing page quanto no card de integração interno. Isso dará o mesmo estilo visual da logo do Facebook (fundo colorido suave com ícone centralizado).

## Alterações

### 1. `src/components/landing/IntegrationsSection.tsx` (linha 158)
Adicionar `bg-amber-100` ao container da logo:
```html
<div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-amber-100">
```

### 2. `src/components/settings/ConexaIntegration.tsx` (linha 122)
Adicionar `bg-amber-100` ao container da logo:
```html
<div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-amber-100">
```

Duas linhas alteradas, efeito puramente visual.

