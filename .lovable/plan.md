

# Fast-Track de Faturamento — Plano Atualizado

## Resumo
Apos criar um novo cliente, o sistema abre automaticamente um dialog para gerar a primeira cobranca, com validacao de data retroativa, sincronizacao de vencimento e integracao correta com gateways.

## Alteracoes

### 1. Extrair hook compartilhado: `useCreatePayment`
- Extrair a logica de submissao do `PaymentSheet.tsx` (linhas 125-168) para um hook `src/hooks/useCreatePayment.ts`
- O hook recebe os dados do pagamento e executa: insert em `client_payments`, chamada ao gateway (Asaas/Conexa) quando implementado, e update de contrato se solicitado
- Tanto `PaymentSheet` quanto `FirstPaymentDialog` usarao esse hook, garantindo um unico motor de emissao

### 2. Novo componente: `src/components/admin/FirstPaymentDialog.tsx`
- Dialog com props: `isOpen`, `onClose`, `client` (dados do cliente recem-criado)
- Campos pre-preenchidos: Valor (`monthly_value`), Descricao ("Mensalidade - [Mes]"), Metodo (`default_billing_type`), DatePicker
- **Regra 1 — Gateway real**: Usa `useCreatePayment` para submissao, nao um insert direto. Se `billingType` for `asaas` ou `conexa`, a mesma logica de gateway e usada
- **Regra 2 — Valor minimo**: Botao "Gerar Cobranca" desabilitado se valor <= 0 ou nulo. Mensagem inline de erro no campo
- **Regra 3 — Limpeza de estado**: `onClose` sempre chama `setFirstPaymentClient(null)`. O Dialog usa `onOpenChange` que captura ESC, backdrop e botao X
- **Logica de data retroativa**: Se `due_date` do cliente ja passou no mes atual, seta DatePicker para hoje + Alert amarelo
- **Checkbox de sincronizacao**: "Definir este dia como novo vencimento padrao" — marcado por padrao se data foi alterada. Se marcado, faz update em `clients.due_date`
- **Pre-Flight Check**: Se `billingType != 'manual'`, verifica `document` e `zip_code` do cliente. Bloqueia submissao com Alert se ausentes

### 3. Refatorar `ClientForm.tsx`
- Adicionar prop `onClientCreated?: (client: any) => void`
- No fluxo de criacao, apos insert bem-sucedido: chamar `onClientCreated(newClientData)` em vez de fechar diretamente
- **Remover** a logica atual de auto-gerar pagamento (linhas 208-244) — substituida pelo FirstPaymentDialog

### 4. Integrar no `Admin.tsx`
- Estado: `const [firstPaymentClient, setFirstPaymentClient] = useState<any>(null)`
- `onClientCreated`: fecha ClientForm, seta `firstPaymentClient`
- `<FirstPaymentDialog>` conectado a esse estado
- `onClose` do dialog: `setFirstPaymentClient(null)` + refetch — captura todos os metodos de fechamento (ESC, backdrop, botao)

## Nenhuma migration necessaria
A coluna `due_date INTEGER` ja existe em `clients`.

## Arquivos
- `src/hooks/useCreatePayment.ts` (novo)
- `src/components/admin/FirstPaymentDialog.tsx` (novo)
- `src/components/admin/PaymentSheet.tsx` (refatorar para usar hook)
- `src/components/admin/ClientForm.tsx` (refatorar)
- `src/pages/Admin.tsx` (integrar)

