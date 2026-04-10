

# Responsividade do PublicClientReport.tsx

## Problema
Os números grandes (ex: "R$ 652.76", "77.316") transbordam dos cards e dos blocos do funil em telas pequenas. Os blocos do funil com largura percentual (70%, 40%) ficam estreitos demais, cortando o conteúdo.

## Alterações em `src/pages/PublicClientReport.tsx`

### 1. Cards de Métricas - Texto Responsivo
- Trocar `text-3xl` por `text-xl sm:text-2xl md:text-3xl` nos valores
- Adicionar `min-w-0` e `break-words` / `overflow-hidden` nos cards
- Reduzir padding de `p-5` para `p-3 sm:p-5`

### 2. Funil do Tráfego - Larguras Mínimas
- Mudar larguras de `100%/70%/40%` para `100%/85%/70%` para evitar esmagamento
- Adicionar `min-w-0` nos blocos do funil
- Reduzir font-size do valor de `text-lg` para `text-base sm:text-lg`
- Reduzir label de `text-sm` para `text-xs sm:text-sm`
- Reduzir padding de `px-5 py-4` para `px-3 py-3 sm:px-5 sm:py-4`

### 3. Gráfico AreaChart
- Reduzir `height` de 250 para 200 em mobile via classe condicional
- Ajustar `margin.left` de -20 para -15

### 4. Container Geral
- O `max-w-lg` já limita bem; adicionar `px-3 sm:px-4` para telas muito pequenas

## Arquivo modificado: 1
- `src/pages/PublicClientReport.tsx`

