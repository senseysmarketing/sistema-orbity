
## Cobrança Manual Instantânea via WhatsApp (Fluxo de Caixa) — com 4 Guardrails

Adicionar a ação "💬 Enviar Cobrança" no menu de três pontinhos de cada pagamento pendente da tabela de Fluxo de Caixa do Admin. Abre um modal que pré-preenche o template do gateway correto (Asaas / Conexa / PIX / Genérico), permite edição livre e dispara via a Edge Function `whatsapp-send` já existente (instância `billing` com fallback para `general`).

---

### 1. Enriquecer o `CashFlowItem`

`src/hooks/useFinancialMetrics.tsx`:

- Adicionar à interface `CashFlowItem`:
  - `clientId?: string`
  - `clientPhone?: string | null`
- No `unifiedCashFlow` (~linha 511): popular `clientId: client.id` e `clientPhone: client.phone ?? null` para itens de `client_payment`.
- No `forecastCashFlow` (~linha 675): também popular `clientId` e `clientPhone` a partir do `forecastClients`.

---

### 2. Novo componente `ManualBillingDialog.tsx`

Caminho: `src/components/admin/CommandCenter/ManualBillingDialog.tsx`

**Props:** `{ open, onOpenChange, item: CashFlowItem, agencyId: string }`

**Layout (Quiet Luxury — Dialog shadcn, max-w-2xl):**
- Header: "Enviar Cobrança Manual" + descrição com nome do cliente.
- Aviso compacto se `clientPhone` vazio (bloqueia botão de envio).
- `Select` "Template": `asaas | conexa | pix | generic`. Inicial: deduzido de `item.billingType` (sem `invoiceUrl` e `manual` → `pix`).
- `Textarea` (10 linhas, editável) com mensagem renderizada.
- Linha de ajuda discreta listando variáveis.
- Footer: `Cancelar` + `Enviar via WhatsApp` (ícone `MessageCircle`, loading state).

**Dicionário de templates (constante local):**
```ts
const TEMPLATES = {
  asaas: "Olá {{nome_cliente}}, passando para lembrar que sua fatura no valor de {{valor_formatado}} vence em {{data_vencimento}}. Segue o link para pagamento via Asaas:\n{{link_fatura}}",
  conexa: "Olá {{nome_cliente}}, sua fatura de {{valor_formatado}} está disponível. Vencimento: {{data_vencimento}}.\nLink para pagamento: {{link_fatura}}",
  pix: "Olá {{nome_cliente}}, segue lembrete da sua cobrança de {{valor_formatado}} com vencimento em {{data_vencimento}}. Para pagar via PIX, me avise por aqui que envio a chave.",
  generic: "Olá {{nome_cliente}}, lembrete da fatura no valor de {{valor_formatado}} com vencimento em {{data_vencimento}}.{{#link}}\nLink para pagamento: {{link_fatura}}{{/link}}",
};
```

---

### 🛡️ Guardrails Técnicos (aplicados ESTRITAMENTE)

**Guardrail 1 — Timezone Trap (parse manual de `YYYY-MM-DD`):**
```ts
const [year, month, day] = item.dueDate.split('T')[0].split('-');
const formattedDate = `${day}/${month}/${year}`;
```
NUNCA `new Date(item.dueDate)`. Respeita a regra de fuso horário do projeto (UTC armazenado, BRT exibido).

**Guardrail 2 — Parse robusto de `{{#link}}...{{/link}}`:**
```ts
function renderTemplate(tpl: string, vars: Record<string,string>, hasLink: boolean) {
  let out = hasLink
    ? tpl.replace(/\{\{#link\}\}/g, '').replace(/\{\{\/link\}\}/g, '')
    : tpl.replace(/\{\{#link\}\}[\s\S]*?\{\{\/link\}\}/g, '');
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}
```

**Guardrail 3 — Prevenção de perda de dados ao trocar template:**
```ts
const [isEdited, setIsEdited] = useState(false);
// onChange do Textarea → setIsEdited(true)
// onValueChange do Select:
if (isEdited && !window.confirm(
  "Você fez alterações manuais na mensagem. Deseja substituí-la pelo novo modelo?"
)) return; // aborta troca
setMessage(renderTemplate(TEMPLATES[newTpl], vars, !!item.invoiceUrl));
setSelectedTpl(newTpl);
setIsEdited(false);
```

**Guardrail 4 — Higienização do telefone antes do envio:**
```ts
const cleanPhone = (item.clientPhone ?? '').replace(/\D/g, '');
if (cleanPhone.length < 10) { toast.error("Telefone inválido"); return; }
await supabase.functions.invoke('whatsapp-send', {
  body: { account_id, phone_number: cleanPhone, message }
});
```

---

### 3. Lookup da conta WhatsApp

Dentro do dialog, ao montar, buscar `whatsapp_accounts` da agência:
- 1ª tentativa: `purpose='billing'` e `status='connected'`.
- Fallback: `purpose='general'` e `status='connected'`.
- Se nenhuma → exibir aviso e desabilitar botão de envio.

---

### 4. Integração no `CashFlowTable.tsx`

`src/components/admin/CommandCenter/CashFlowTable.tsx`:

- Importar `MessageCircle` e `ManualBillingDialog`.
- State: `const [billingItem, setBillingItem] = useState<CashFlowItem | null>(null);`
- Adicionar `DropdownMenuItem` "💬 Enviar Cobrança" logo após "Ver Fatura" (~linha 349), exibido quando:
  - `item.type === 'INCOME'`
  - `item.status !== 'PAID'` e `item.status !== 'CANCELLED'`
  - `!isForecastItem`
- Renderizar `<ManualBillingDialog open={!!billingItem} onOpenChange={(o)=>!o&&setBillingItem(null)} item={billingItem!} agencyId={agencyId} />` ao final.

---

### 5. Estética / UX

- Dialog max-w-2xl, sem modais aninhados (`window.confirm` é nativo, não viola a constraint).
- Botão "Enviar via WhatsApp": variante `default` (primary do tema). Sem cores berrantes.
- Toast de sucesso: `"Cobrança enviada com sucesso para {nome}"`.

---

### Arquivos modificados

```text
src/hooks/useFinancialMetrics.tsx                                (add clientId + clientPhone)
src/components/admin/CommandCenter/CashFlowTable.tsx             (new menu item + dialog mount)
src/components/admin/CommandCenter/ManualBillingDialog.tsx       (NEW)
```

Sem migrações de banco. Sem novas edge functions. Sem novos segredos.
