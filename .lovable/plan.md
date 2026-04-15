

# Bento Grid + Premium UI + Privacidade — IntegrationsSection

## Resumo
Reestruturar a secção com Bento Grid (WhatsApp destaque full-width + 4 cards normais em 2x2), aplicar polimento visual premium, badges "Novo", textura pontilhada de fundo, e integrar a secção de Privacidade de forma compacta e elegante.

## Estrutura final
```text
┌─────────────────────────────────────────────────┐
│         WhatsApp Multi-Instância (Novo)         │  ← full-width, layout horizontal
└─────────────────────────────────────────────────┘
┌──────────────────────┐  ┌──────────────────────┐
│   Meta Business      │  │  Google Calendar     │
└──────────────────────┘  └──────────────────────┘
┌──────────────────────┐  ┌──────────────────────┐
│   Asaas (Novo)       │  │   Conexa (Novo)      │
└──────────────────────┘  └──────────────────────┘
┌─────────────────────────────────────────────────┐
│  🔒 Compromisso com sua Privacidade (compacto)  │  ← inline banner, full-width
└─────────────────────────────────────────────────┘
          [ Comece a Integrar Agora ]
```

## Alterações em `src/components/landing/IntegrationsSection.tsx`

### 1. Import adicional
- Adicionar `import { Badge } from "@/components/ui/badge";`

### 2. Fundo da secção
- Substituir gradiente por: `bg-slate-50/50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] relative`

### 3. Grelha: `grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto`
- WhatsApp como primeiro card com `md:col-span-2`, layout interno `flex-col md:flex-row` (ícone+título à esquerda, bullets à direita)
- 4 cards normais (Meta, Google Calendar, Asaas, Conexa) em 2x2

### 4. Polimento visual (todos os cards)
- Classes: `group bg-white border border-gray-100 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl` (igual ao `rounded-2xl` da AIFeaturesSection)
- Ícones: `group-hover:scale-110 transition-transform duration-300`

### 5. Badges "Novo"
- Nos títulos de WhatsApp, Asaas e Conexa: `<Badge variant="secondary" className="ml-2 text-xs bg-primary/10 text-primary hover:bg-primary/20">Novo</Badge>`

### 6. Privacidade (compacta, integrada na grelha)
- Manter a secção de Privacidade mas como um banner horizontal compacto (`md:col-span-2`) dentro da mesma grelha, logo abaixo dos 4 cards
- Layout: ícone Shield pequeno à esquerda, texto resumido ao centro, 3 badges (Criptografado, Sem rastreamento, LGPD) à direita
- Estilo: `bg-white/80 border border-gray-100 rounded-2xl p-5` (mais leve, sem o destaque pesado anterior)
- Reduzir o texto para uma linha mais concisa, mantendo a mensagem essencial

### 7. Botão CTA
- Manter abaixo da grelha, sem alterações

## Arquivo alterado
1. `src/components/landing/IntegrationsSection.tsx` — reescrita completa

