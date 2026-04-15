

# Substituir Logo Texto por Imagem no Header

## Resumo
Trocar o texto "Orbity" no cabeçalho por a imagem do logo (`LogoPNG01-3.png`). Como o logo é branco sobre fundo transparente, ele funciona perfeitamente no estado não-scrolled (fundo escuro). No estado scrolled (fundo claro), será necessário aplicar um filtro de inversão ou usar uma versão escura.

## Alterações

### 1. Copiar logo para o projeto
- `lov-copy user-uploads://LogoPNG01-3.png src/assets/orbity-logo-white.png`

### 2. `src/components/landing/LandingHeader.tsx`
- Importar a imagem: `import orbityLogo from "@/assets/orbity-logo-white.png"`
- Substituir o `<button>` com texto "Orbity" (linhas 39-48) por um `<button>` contendo `<img>`:
  - `<img src={orbityLogo} alt="Orbity" className="h-8 transition-all duration-300" />`
  - Quando `scrolled = true` (fundo claro): aplicar `brightness(0)` via classe para tornar o logo escuro — `style={{ filter: scrolled ? 'brightness(0)' : 'none' }}`
  - Quando `scrolled = false` (fundo escuro): logo branco original, sem filtro

## Arquivos alterados
1. `src/assets/orbity-logo-white.png` (novo)
2. `src/components/landing/LandingHeader.tsx` (substituir texto por imagem)

