

# Templates de Contrato com Variáveis Mágicas — Plano final aprovado

## 1. Schema (`contract_templates`)

```sql
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_templates_agency ON public.contract_templates(agency_id);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members read templates"
  ON public.contract_templates FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "agency members write templates"
  ON public.contract_templates FOR ALL
  USING (user_belongs_to_agency(agency_id))
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE TRIGGER trg_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## 2. `ContractTemplatesManager.tsx` (novo)

Layout dividido (Quiet Luxury, `border border-border/60`, sem sombras pesadas):

- **Lista (esquerda, `w-72`)**: Cards minimalistas com nome + data + ações Editar/Excluir. Botão "Novo Modelo" no topo.
- **Editor (direita, flex-1)**:
  - Input "Nome do Modelo"
  - Painel sticky de **Variáveis Mágicas** — chips clicáveis (`Badge variant="outline"` com `cursor-pointer`) que copiam o placeholder ao clipboard + toast "Variável copiada":
    - **Cliente**: `{{CLIENT_NAME}}`, `{{CLIENT_DOCUMENT}}`, `{{CLIENT_ADDRESS}}`, `{{CLIENT_EMAIL}}`, `{{CLIENT_PHONE}}`
    - **Contrato**: `{{CONTRACT_VALUE}}`, `{{START_DATE}}`, `{{END_DATE}}`
    - **Agência**: `{{AGENCY_NAME}}`, `{{AGENCY_DOCUMENT}}`
  - `Textarea` (`min-h-[500px] font-mono text-sm leading-relaxed`)
  - Botões "Salvar" / "Cancelar"
- CRUD direto via `supabase.from('contract_templates')`.

## 3. Integração em `Contracts.tsx`

`<Tabs>` com **Contratos** (`ContractsList`) e **Modelos** (`ContractTemplatesManager`).

Botão "Novo Contrato" vira `DropdownMenu` com:
- "Gerar com IA" → `SmartContractGenerator` (intacto)
- "Usar Modelo" → `TemplateContractWizard` (novo)

## 4. `TemplateContractWizard.tsx` (3 passos)

Mesma assinatura (`onCancel`, `onComplete`). Header com "Passo X de 3" + Progress fina.

### Passo 1 — Base
- Toggle "Cliente cadastrado" / "Manual".
- Cadastrado: `Select` com clientes da agência.
- Manual: inputs Nome, Documento, Email, Telefone, Endereço.
- `Select` de Modelo (lista de `contract_templates`).

### Passo 2 — Variáveis do Contrato
- Valor Mensal (R$) — obrigatório
- Data de Início — obrigatória
- Data de Término — opcional
- **Guardrail 1 — Documento da Agência**:
  - Novo input: "Documento da Agência (CNPJ/NIF) — Opcional"
  - Estado inicializado de `localStorage.getItem('orbity_agency_doc_' + agencyId)` ou string vazia
  - Ao salvar (avançar para passo 3), persiste em `localStorage.setItem('orbity_agency_doc_' + agencyId, value)`
  - Hint sob o campo: "Salvo no seu navegador para os próximos contratos."

### Passo 3 — Revisão Final

**Guardrail 3 — Aviso visual no topo**:
```tsx
<Alert variant="default" className="border-border/60">
  <Info className="h-4 w-4" />
  <AlertDescription>
    Reveja os dados abaixo. Variáveis sem informação no CRM foram preenchidas com 
    <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">—</code>.
    Substitua antes de salvar.
  </AlertDescription>
</Alert>
```

**Composição do conteúdo** (executada uma vez ao entrar no passo):
```ts
const map = {
  '{{CLIENT_NAME}}': clientName || '—',
  '{{CLIENT_DOCUMENT}}': clientDocument || '—',
  '{{CLIENT_ADDRESS}}': formatAddress(client) || '—',
  '{{CLIENT_EMAIL}}': clientEmail || '—',
  '{{CLIENT_PHONE}}': clientPhone || '—',
  '{{CONTRACT_VALUE}}': formatBRL(monthlyValue),
  '{{START_DATE}}': format(startDate, 'dd/MM/yyyy'),
  '{{END_DATE}}': endDate ? format(endDate, 'dd/MM/yyyy') : 'Indeterminado',
  '{{AGENCY_NAME}}': currentAgency.name,
  '{{AGENCY_DOCUMENT}}': agencyDoc || '—',
};
let out = template.content;
Object.entries(map).forEach(([k, v]) => { out = out.split(k).join(v); });
```

**Guardrail 2 — Editor com formatação preservada**:

Container de leitura/edição em duas camadas:
- `Textarea` com classes: `min-h-[600px] font-serif text-[15px] leading-7 whitespace-pre-wrap p-6 bg-background border-border/60`
- `style={{ tabSize: 2 }}` para preservar indentação
- Espaçamento entre cláusulas mantido pelo `\n\n` original do template + `whitespace-pre-wrap`

Botão "Salvar Contrato" → `INSERT` em `contracts`:
```ts
{
  agency_id, client_id, client_name, client_cpf_cnpj: clientDocument,
  client_address, client_email, client_phone,
  total_value: monthlyValue,
  start_date, end_date,
  custom_clauses: contractContent,
  status: 'draft',
  created_by: user.id
}
```

## 5. Estética Quiet Luxury — guardrails visuais

- Bordas finas (`border-border/60`), sem ring agressivo
- Tipografia: `font-mono` no editor de template, `font-serif text-[15px] leading-7` no editor de revisão (sensação de documento jurídico)
- Sem cores destrutivas em avisos informativos — apenas `<Alert variant="default">`
- Espaçamento generoso (`space-y-6` entre seções do wizard)

## Arquivos

**Novos:**
- `src/components/contracts/ContractTemplatesManager.tsx`
- `src/components/contracts/TemplateContractWizard.tsx`

**Editados:**
- `src/pages/Contracts.tsx` — Tabs + DropdownMenu no botão "Novo Contrato"

**Migration:**
- `contract_templates` + RLS + trigger `updated_at`

## Sem mudanças

- `SmartContractGenerator.tsx` (fluxo IA preservado)
- `ContractsList.tsx`, tabela `contracts`, edge `ai-assist`
- Schema `agencies` (CNPJ resolvido via input + localStorage no wizard)

