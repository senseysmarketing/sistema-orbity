

# Ajustes na Hero Section

## 1. Substituir imagem do mascote Orbi
- Copiar `user-uploads://Design_sem_nome_3.png` para `src/assets/orbi-mascot.png` (sobrescrever a atual)

## 2. Corrigir botao "Agendar Apresentacao"
O botao outline esta com `border-white/30 text-white` mas visualmente aparece todo branco. Adicionar `bg-transparent` explicitamente para garantir fundo transparente, e reforcar o estilo do outline.

Classe corrigida: `text-lg border-white/30 text-white bg-transparent hover:bg-white/10 hover:border-white/50`

## Arquivos alterados
1. `src/assets/orbi-mascot.png` (substituido pela nova imagem)
2. `src/components/landing/HeroSection.tsx` (ajuste no className do botao)

