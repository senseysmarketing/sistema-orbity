

# Redesign "Quiet Luxury" — DemoSection + IntegrationsSection

## 1. `src/components/landing/DemoSection.tsx` — Reescrita completa

Substituir todo o conteúdo por um componente minimalista Apple-style:

- **Fundo**: `bg-slate-50`, `pt-20 pb-0 px-4` (sem padding inferior para fundir)
- **Imports**: Remover `Eye`, `Sparkles`, `DemoCarousel`. Manter apenas `Badge` e `ArrowRight`
- **Header**: Badge discreto em slate, H2 com `tracking-tight text-slate-900` e `md:text-5xl`, subtítulo `text-slate-600`
- **Video Container**:
  - Wrapper `relative group max-w-5xl`
  - Glow div atrás: `from-purple-600/15 to-indigo-600/15 blur-2xl opacity-40 group-hover:opacity-70`
  - Container principal: `aspect-video rounded-[2rem] border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.1),0_10px_15px_rgba(0,0,0,0.05)]`
  - Hover: `transition-transform duration-700 ease-out hover:scale-[1.01]`
  - Conteúdo: `<img src="/placeholder.svg" />` como placeholder 16:9
- **CTA removido** (já existe no IntegrationsSection)

## 2. `src/components/landing/IntegrationsSection.tsx` — Linha 13

Trocar:
```
py-20 bg-slate-50/50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] relative
```
Por:
```
pt-0 pb-20 bg-slate-50 relative
```

Remove textura de pontos e padding-top para fusão contínua.

## Resultado
Bloco único e contínuo em `bg-slate-50`: vídeo 16:9 premium com glow sutil → cards de integrações sem quebra visual.

