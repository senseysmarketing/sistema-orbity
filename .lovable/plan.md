## Objetivo

Adicionar um botão "Salvar modelo" ao lado de "Cancelar" / "Enviar via WhatsApp" no `ManualBillingDialog`, persistindo a mensagem editada **por agência** e **por modelo** (Asaas, Conexa, PIX, Genérico). Da próxima vez que aquele modelo for selecionado naquela agência, o texto carregado será o customizado — não o default hardcoded.

## Escopo e princípios

- **Tabela isolada** (`agency_billing_templates`) — não reutilizar a `whatsapp_templates` (que é do CRM/leads) para evitar acoplamento.
- **Chave única** `(agency_id, template_key)` — onde `template_key ∈ {asaas, conexa, pix, generic}`. Upsert simples, no máximo 4 linhas por agência.
- **Variáveis preservadas como tokens** — salvamos o texto cru com `{{nome_cliente}}`, `{{valor_formatado}}`, `{{data_vencimento}}`, `{{link_fatura}}`, `{{#link}}…{{/link}}`. A renderização (Guardrails 1 e 2 já implementados) acontece sempre no momento de abrir o diálogo.
- **Defaults imutáveis** — os 4 templates hardcoded em `ManualBillingDialog.tsx` continuam sendo o fallback. Se a agência não tem custom salvo para aquele key, usa o default.
- **Reset opcional** — incluir um item discreto no menu de overflow (ou um link "restaurar padrão") para apagar o custom e voltar ao default.

## Camada 1 — Migration (Supabase)

Criar tabela `public.agency_billing_templates`:

```text
id              uuid PK default gen_random_uuid()
agency_id       uuid NOT NULL references agencies(id) on delete cascade
template_key    text NOT NULL  CHECK (template_key IN ('asaas','conexa','pix','generic'))
content         text NOT NULL
updated_by      uuid references auth.users(id)
created_at      timestamptz default now()
updated_at      timestamptz default now()
UNIQUE (agency_id, template_key)
```

- Enable RLS.
- Policies (usar `(select auth.uid())` conforme regra de performance):
  - SELECT: membros da agência (via helper `is_agency_member` já existente, ou EXISTS em `agency_members`).
  - INSERT/UPDATE/DELETE: somente admins/owners da agência (reaproveitar padrão usado em outras tabelas administrativas — confirmar helper antes da migration).
- Trigger `set_updated_at` (padrão do projeto).

## Camada 2 — UI (`ManualBillingDialog.tsx`)

1. **Carregamento ao abrir / trocar de modelo**:
   - Após detectar `selectedTpl`, fazer `select` em `agency_billing_templates` filtrando por `agency_id` e `template_key`.
   - Se existir → usar `data.content` como template base; senão → usar `TEMPLATES[selectedTpl]` (default atual).
   - Renderizar com `renderTemplate(...)` (mantém Guardrails 1 e 2).
   - Cache local em `useRef` para evitar refetch ao alternar entre modelos no mesmo diálogo aberto.

2. **Novo botão "Salvar modelo"** no `DialogFooter`, à esquerda de "Cancelar":
   - Variant `ghost` ou `outline`, ícone `Save` (lucide).
   - Habilitado somente quando `isEdited === true` (evita salvar o default sem mudanças).
   - Ao clicar:
     - Reverter a mensagem renderizada para a forma "crua com tokens": substituir os valores resolvidos de volta pelos placeholders (ex.: `formatCurrency(item.amount)` → `{{valor_formatado}}`, `formatDueDate(item.dueDate)` → `{{data_vencimento}}`, `item.title` → `{{nome_cliente}}`, `item.invoiceUrl` → `{{link_fatura}}`).
     - Se `item.invoiceUrl` ausente, **não** tentar reinserir bloco `{{#link}}…{{/link}}` (manter o que o usuário escreveu).
     - Upsert em `agency_billing_templates` por `(agency_id, template_key)`.
     - `toast.success("Modelo salvo para futuros envios")`, manter diálogo aberto, setar `isEdited = false`.

3. **Indicador visual** discreto no `Select` quando o modelo atual já tem versão customizada salva (badge "Personalizado" ao lado do label, opcional, baixo custo).

4. **Restaurar padrão** (opcional, recomendado): pequeno botão `link` "Restaurar padrão" abaixo do textarea — visível só quando há custom salvo. Faz `delete` na linha e recarrega o default.

### Detalhe técnico — "des-renderizar" antes de salvar

Para garantir que tokens sejam preservados, salvamos a mensagem que o usuário vê substituindo na ordem inversa:

```text
content → replace(formatCurrency(amount), "{{valor_formatado}}")
       → replace(formatDueDate(dueDate),  "{{data_vencimento}}")
       → replace(item.title,              "{{nome_cliente}}")
       → if invoiceUrl: replace(invoiceUrl, "{{link_fatura}}")
```

Como esses valores são únicos no contexto de uma cobrança real (nome + valor formatado + data + URL), a colisão é improvável. Documentar limitação no código: se o usuário escrever literalmente "R$ 990,00" sem ter sido o token, vira `{{valor_formatado}}` ao salvar — comportamento aceitável e previsível.

## Camada 3 — Tipagem

- Após a migration, os tipos do Supabase (`src/integrations/supabase/types.ts`) serão regenerados automaticamente — nenhuma ação manual.

## Arquivos afetados

- **Criado**: `supabase/migrations/<timestamp>_agency_billing_templates.sql`
- **Editado**: `src/components/admin/CommandCenter/ManualBillingDialog.tsx`
- (Auto) `src/integrations/supabase/types.ts`

## Fora do escopo

- Versionamento/histórico de templates.
- Templates por cliente individual (apenas por agência, conforme pedido).
- UI dedicada de gestão em Configurações (a edição inline no diálogo já cobre o caso de uso). Se desejado depois, podemos adicionar uma aba em Ajustes.
