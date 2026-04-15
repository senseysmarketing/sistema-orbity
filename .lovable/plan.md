

# Expandir IntegrationsSection com 3 novos cards

## Alterações em `src/components/landing/IntegrationsSection.tsx`

1. **Imports**: Adicionar `MessageCircle`, `CreditCard`, `BarChart3` do lucide-react
2. **Grid**: Alterar container para `lg:grid-cols-3 max-w-7xl`
3. **3 novos cards** inseridos após Google Calendar, mesma estrutura Tailwind existente:
   - **WhatsApp Multi-Instância** — MessageCircle green-600, bg-green-500/10, subtítulo "Atendimento & Cobrança"
   - **Asaas** — CreditCard blue-600, bg-blue-500/10, subtítulo "Gateway de Pagamentos"
   - **Conexa** — BarChart3 orange-600, bg-orange-500/10, subtítulo "Gestão Financeira Integrada"

Cada card com 4 bullets usando dot pattern existente. Conteúdo exatamente conforme especificado pelo utilizador.

## Arquivo alterado
- `src/components/landing/IntegrationsSection.tsx`

