

# Estilizar badge "Conheça o Sistema" no padrão do "Orbity AI Copilot"

## Alteração única: `src/components/landing/DemoSection.tsx`

### O que muda
Substituir o `<Badge>` atual por um `<span>` estilizado igual ao badge "Orbity AI Copilot" da `AIFeaturesSection`:
- Formato: `inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium`
- Cor: `bg-purple-500/10 text-purple-600 border border-purple-200/50` (versão light, pois a secção tem fundo claro)
- Ícone: `Play` ou `Monitor` do lucide-react (para representar "ver o sistema")
- Remover import do `Badge` (não mais necessário)
- Adicionar import do ícone escolhido de `lucide-react`

### Resultado
Badge maior, com ícone e estilo premium consistente com o padrão já usado na landing page.

