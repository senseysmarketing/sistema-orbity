

# Upgrade Visual do PublicClientReport.tsx

## Resumo
Redesign completo da página de relatório público: glassmorphism real nos cards, gráfico de evolução com recharts, funil de conversão visual, e refinamento das campanhas top.

## Alterações no arquivo `src/pages/PublicClientReport.tsx`

### 1. Cards de Métricas (Glassmorphism Premium)
- Atualizar classes dos cards para: `bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl`
- Ícone grande no canto superior direito com `absolute top-3 right-3 h-8 w-8 text-white/10`
- Valores com `text-3xl font-black tracking-tight text-white` e `textShadow` mais forte para efeito de brilho

### 2. Gráfico "Evolução (Últimos 7 dias)" com Recharts
- Importar `ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid` de `recharts`
- Criar array mock de 7 dias com campos `day`, `investimento`, `conversoes`
- `ResponsiveContainer` com `height={250}`
- Dois `<Area>`: investimento (roxo `#8b5cf6`) e conversões (verde `#10b981`)
- `<defs>` com `<linearGradient>` translúcido para preenchimento das áreas
- `CartesianGrid` com `vertical={false}` e `strokeDasharray`
- Tooltip customizado dark mode
- Envolver em `motion.div` com fade-up (delay ~0.9)

### 3. Funil do Tráfego
- Seção "Funil do Tráfego" com 3 blocos empilhados de largura decrescente (100%, 70%, 40%)
- Cada bloco: glassmorphism card com label, valor (CountUp) e cor de destaque
  - Impressões (azul) -> Cliques (roxo) -> Conversões (verde)
- Setas `<ArrowDown>` entre os blocos com `text-white/20`
- Envolver em `motion.div` com fade-up (delay ~1.1)

### 4. Refinamento "Top Campanhas"
- Manter gradiente na Progress bar (já existe `from-blue-500 to-violet-500`)
- Adicionar CPA calculado (`campaign.spend / campaign.conversions`) abaixo de cada campanha
- Exibir como: `"CPA: R$ XX,XX"` em `text-white/40 text-[11px]`

### 5. Imports adicionais
- `ArrowDown` de lucide-react
- Componentes do recharts

## Arquivos modificados: 1
- `src/pages/PublicClientReport.tsx`

