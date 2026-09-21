# Corrigir inativação de clientes sem perder cobranças mantidas

## Diagnóstico confirmado

- **Maria Tatto** está inativa desde **21/09/2026 às 14:10 (BRT)**.
- A cobrança de **R$ 1.291,34**, vencimento **25/09/2026**, continua no banco como **pendente** e com a fatura Conexa preservada; ela não foi excluída nem cancelada.
- O fluxo de inativação respeitou a escolha “Manter cobrança” e não alterou esse lançamento.
- O erro está na exibição e nos cálculos: o fluxo de caixa oculta toda cobrança pendente de um cliente inativo no mês, sem distinguir uma cobrança que foi explicitamente mantida durante a inativação.
- A reativação já restaura `active` e limpa a data de cancelamento, mas o comportamento será revisado junto com os estados financeiros para manter consistência.

## Implementação

### 1. Registrar explicitamente cobranças mantidas
Adicionar às cobranças um indicador de que o lançamento foi preservado após a inativação do cliente. Assim, o sistema não dependerá apenas do status atual do cliente para decidir se deve mostrar e cobrar aquele lançamento.

### 2. Tornar a inativação consistente e segura
Ao confirmar a inativação:
- cobranças escolhidas como **Cancelar** passam para `cancelled`;
- cobranças escolhidas como **Manter** recebem o indicador de preservação;
- só depois o cliente fica inativo;
- se qualquer etapa falhar, nenhuma alteração parcial será mantida.

O resumo final continuará informando quantas cobranças foram canceladas e quantas foram mantidas.

### 3. Corrigir fluxo de caixa e indicadores
No mês atual e nos meses históricos:
- pagamentos já realizados continuam visíveis;
- cobranças pendentes/atrasadas explicitamente mantidas continuam no fluxo de caixa e na receita esperada, mesmo com o cliente inativo;
- cobranças canceladas permanecem fora dos totais;
- clientes inativos não geram novas projeções nem novas mensalidades futuras.

### 4. Manter ativação e reativação coerentes
Centralizar a atualização das telas após ativar ou inativar um cliente e garantir que a reativação não duplique cobranças. Lançamentos existentes permanecem intactos; novas mensalidades seguem a regra normal apenas para clientes ativos.

### 5. Recuperar a cobrança da Maria Tatto
Marcar a cobrança existente de **R$ 1.291,34 com vencimento em 25/09/2026** como preservada. Ela voltará ao fluxo de caixa sem criar uma segunda cobrança e mantendo os dados da fatura Conexa atual.

### 6. Validar o fluxo completo
Testar os dois caminhos com cobranças pendentes:
- inativar e **manter**: cobrança continua visível, contabilizada e disponível para cobrança;
- inativar e **cancelar**: cobrança sai dos totais e fica cancelada;
- reativar: cliente volta à carteira sem duplicar lançamentos;
- confirmar especificamente a cobrança recuperada da Maria Tatto no fluxo de setembro.

## Detalhes técnicos

- Criar uma migração para o indicador de preservação e uma operação transacional de offboarding, com validação da agência e permissões existentes.
- Atualizar `ClientOffboardingDialog` para enviar as decisões em uma única operação, evitando estado parcial.
- Atualizar `useFinancialMetrics` para considerar cobranças preservadas em `unifiedCashFlow`, `expectedRevenue` e inadimplência.
- Manter a régua de cobrança compatível: a cobrança preservada continua elegível, enquanto nenhuma nova cobrança mensal é criada após a inativação.
- Atualizar os tipos locais e adicionar testes de regressão para cliente inativo com cobrança mantida, cancelada e paga.
