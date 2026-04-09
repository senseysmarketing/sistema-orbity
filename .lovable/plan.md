

# Pivotagem para Venda Consultiva (High-Ticket)

Transformar o Orbity de self-service para plataforma fechada com funil de qualificacao.

---

## Arquivos a criar

### `src/components/landing/ApplicationModal.tsx`
Modal de qualificacao estilo Typeform com 4 steps usando framer-motion (ja disponivel no projeto):

- **Step 1 (Contato)**: Nome Completo, E-mail, WhatsApp
- **Step 2 (Estrutura)**: Instagram da Agencia, Select "Tamanho da Equipe" (Eu-gencia / 2-5 / 6-15 / 15+)
- **Step 3 (Faturamento)**: Input "Quantos clientes ativos?", Select "Ticket Medio" (< R$1k / R$1-2.5k / R$2.5-5k / > R$5k)
- **Step 4 (Sucesso)**: Mensagem de confirmacao

Componentes: Dialog do shadcn, Progress bar no topo, animacao de slide horizontal entre steps com `motion.div` (AnimatePresence + translateX). Submit simulado com setTimeout + spinner.

---

## Arquivos a modificar

### `src/pages/LandingPage.tsx`
- Remover import e uso de `PricingSection`
- Adicionar estado `applicationOpen` e renderizar `<ApplicationModal>`
- Passar `onOpenApplication` como prop para HeroSection, CTASection, FAQSection

### `src/components/landing/HeroSection.tsx`
- Receber prop `onOpenApplication`
- Botao principal: "Aplicar para Consultoria" → chama `onOpenApplication()` (em vez de navigate)
- Manter botao "Ja tenho conta" apontando para `/auth`

### `src/components/landing/CTASection.tsx`
- Receber prop `onOpenApplication`
- Botao: "Aplicar para Consultoria" (em vez de "Comecar Teste Gratis")
- Remover texto "Nao precisa cartao de credito / Cancele quando quiser"
- Trocar stats: remover "7 dias teste gratis", substituir por algo como "Consultoria Personalizada"

### `src/components/landing/FAQSection.tsx`
- Receber prop `onOpenApplication`
- Atualizar FAQs: remover perguntas sobre teste gratis/cancelamento, adicionar perguntas sobre processo de consultoria
- Botao "Comecar Teste Gratis" → "Aplicar para Consultoria" chamando `onOpenApplication()`

### `src/components/landing/LandingFooter.tsx`
- Remover link "Precos" do footer

### `src/pages/Auth.tsx`
- Remover bloco "Onboarding CTA" (linhas 96-113) com o botao "Criar Nova Agencia" e texto de teste gratis
- Substituir por texto sutil: "Ainda nao utiliza o Orbity?" com link "Agende uma demonstracao" apontando para `href="#demo"` (temporario)

---

## Resultado
- Zero mencao a precos, planos ou teste gratis
- Unica via de entrada: funil de qualificacao (ApplicationModal)
- Tela de Auth: apenas login + link para demonstracao
- Landing page limpa: Hero → Problema → Features → Demo → Integracoes → Diferenciais → Depoimentos → FAQ → CTA final

