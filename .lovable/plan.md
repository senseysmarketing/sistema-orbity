
# Modal de Motivo de Perda + Metricas Avancadas no CRM Dashboard

## Resumo

Tres grandes funcionalidades:

1. **Modal obrigatorio de motivo de perda** ao mover lead para "Perdido" (drag-and-drop ou edicao manual)
2. **Metricas de No-Show e Sales Velocity** no Dashboard do CRM
3. **Benchmarks de mercado** integrados ao funil de vendas e metricas

---

## 1. Banco de Dados

### Nova coluna na tabela `leads`

```sql
ALTER TABLE leads ADD COLUMN loss_reason text DEFAULT NULL;
```

Armazena o motivo de desqualificacao quando o lead vai para "lost". Os motivos predefinidos sao:

**Problemas de Qualificacao:**
- `dados_invalidos` - Dados invalidos / Fake
- `nao_decisor` - Nao e o decisor
- `fora_icp` - Fora do Perfil (ICP)

**Problemas de Engajamento:**
- `ghosting` - Ghosting no WhatsApp
- `no_show` - No-Show (Faltou na Reuniao)

**Problemas Comerciais:**
- `sem_orcamento` - Sem orcamento (Budget)
- `concorrencia` - Optou pela concorrencia
- `sem_valor_percebido` - Nao percebeu valor

**Outro:**
- `outro` - Outro (campo de texto livre)

### Nova coluna para Sales Velocity

```sql
ALTER TABLE leads ADD COLUMN status_changed_at timestamptz DEFAULT now();
```

Registra quando o lead entrou na etapa atual. O trigger `track_lead_changes` ja rastreia mudancas de status no `lead_history`, mas ter `status_changed_at` direto na tabela permite calcular dias na etapa sem JOINs.

### Atualizar trigger `set_lead_won_at`

Expandir para tambem setar `status_changed_at = NOW()` quando o status muda.

---

## 2. Modal de Motivo de Perda

### Novo componente: `src/components/crm/LossReasonDialog.tsx`

- Dialog com titulo "Por que este lead esta sendo desqualificado?"
- RadioGroup com os motivos organizados em 3 categorias (Qualificacao, Engajamento, Comercial)
- Campo de texto adicional quando "Outro" for selecionado
- Botoes "Cancelar" e "Confirmar"
- Ao confirmar: atualiza `status`, `temperature`, `loss_reason` e `status_changed_at` do lead

### Modificacao: `src/components/crm/LeadsKanban.tsx`

- Adicionar estados `showLossDialog`, `pendingLossLeadId`, `pendingLossDbStatus`
- No `handleDragEnd`, quando o status destino normalizado for `lost`:
  - Interromper o fluxo normal
  - Abrir o `LossReasonDialog` em vez de salvar diretamente
- Callback `onConfirmLoss(reason)`:
  - Atualiza o lead no banco com status + loss_reason
  - Fecha o dialog

---

## 3. Dashboard - Metricas Avancadas

### Modificacao: `src/components/crm/CRMDashboard.tsx`

Adicionar tres novos componentes abaixo do funil:

#### A) Card de Motivos de Perda (`CRMLossReasonsChart.tsx`)

- Busca leads com status `lost` no periodo selecionado
- Grafico de barras horizontal ou donut mostrando distribuicao dos motivos
- Tabela resumo com contagem e percentual de cada motivo
- Destaque visual para os 3 motivos mais frequentes

#### B) Card de No-Show / Taxa de Comparecimento

- Integrado no `CRMFunnelChart.tsx`
- Calcula: leads com `loss_reason = 'no_show'`
- No funil, entre "Agendamentos" e "Reunioes", mostrar a taxa real de comparecimento
- Formula: `Reunioes / (Reunioes + No-Shows)` = Taxa de Comparecimento
- Exibir badge com a taxa ao lado da conversao Agendamento -> Reuniao

#### C) Card de Sales Velocity (`CRMSalesVelocity.tsx`)

- Consulta `lead_history` (campo `status_changed`) para calcular tempo medio em cada etapa
- Exibe uma tabela/lista: Etapa | Tempo Medio (dias) | Leads Parados
- Alerta visual para leads com mais de X dias parados (configurable, default 7 dias para Proposta)
- Destaque em vermelho para etapas com leads "travados"

#### D) Benchmarks de Mercado

- Adicionar ao `CRMFunnelChart.tsx` ou como card separado
- Comparar as taxas do usuario com benchmarks:
  - Lead -> Venda: benchmark 1-3%
  - Lead -> Em Contato: benchmark 40-50%
  - Proposta -> Venda (Win Rate): benchmark 20-30%
- Indicador visual (verde/amarelo/vermelho) comparando com o benchmark
- Tooltip explicando cada benchmark

---

## 4. Funil de Vendas - Integracao No-Show

### Modificacao: `src/components/crm/CRMFunnelChart.tsx`

- Receber prop `lossReasons` (ou buscar internamente)
- No calculo do funil, contar No-Shows separadamente
- Adicionar linha entre Agendamentos e Reunioes mostrando:
  - "X No-Shows" e taxa de comparecimento real
- Na secao de conversion rates (bottom), destacar a taxa corrigida

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar `loss_reason` e `status_changed_at` na tabela leads; atualizar trigger |
| `src/components/crm/LossReasonDialog.tsx` | **Novo** - Modal de motivo de perda |
| `src/components/crm/LeadsKanban.tsx` | Interceptar drag para "lost" e abrir dialog |
| `src/components/crm/CRMLossReasonsChart.tsx` | **Novo** - Grafico de motivos de perda |
| `src/components/crm/CRMSalesVelocity.tsx` | **Novo** - Card de velocidade de vendas por etapa |
| `src/components/crm/CRMFunnelChart.tsx` | Adicionar No-Show, benchmarks e taxa de comparecimento |
| `src/components/crm/CRMDashboard.tsx` | Integrar novos componentes + buscar loss_reasons |
