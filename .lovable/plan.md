

# NPS Personalização Total + Tabs + 3 Guardrails de Segurança

## 1. Migration: Adicionar colunas de personalização + RLS restritiva

Adicionar 8 colunas à `nps_settings` e criar policy anon restritiva:

```sql
ALTER TABLE public.nps_settings
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_template text DEFAULT 'Olá {{client_name}}! 👋

Gostaríamos de saber como está a nossa parceria. Avalie-nos em 30 segundos:

🔗 {{nps_link}}

Sua opinião é muito importante! 💙',
  ADD COLUMN IF NOT EXISTS survey_title text DEFAULT 'Olá, {{client_name}}!',
  ADD COLUMN IF NOT EXISTS survey_message text DEFAULT 'Como está nossa parceria?',
  ADD COLUMN IF NOT EXISTS main_question text DEFAULT 'De 0 a 10, o quanto você recomendaria nossos serviços?',
  ADD COLUMN IF NOT EXISTS feedback_label_promoter text DEFAULT 'Ficamos muito felizes! O que mais gostou?',
  ADD COLUMN IF NOT EXISTS feedback_label_neutral text DEFAULT 'Obrigado! O que faltou para a nota ser 10?',
  ADD COLUMN IF NOT EXISTS feedback_label_detractor text DEFAULT 'Sentimos muito por isso. O que podemos fazer IMEDIATAMENTE para resolver o seu problema?';

-- GUARDRAIL 1: Política RESTRITIVA — só lê settings se existir token não-usado da mesma agência
CREATE POLICY "Public read nps settings via token" ON public.nps_settings
  FOR SELECT TO anon 
  USING (EXISTS (SELECT 1 FROM public.nps_tokens t WHERE t.agency_id = nps_settings.agency_id AND t.is_used = false));
```

## 2. NPSPage.tsx — Refactoring para Tabs

Substituir o layout actual por 4 abas usando `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`:

- **Aba "Dashboard"** (default): Métricas + lista de clientes (código existente)
- **Aba "WhatsApp"**:
  - Toggle `whatsapp_enabled` ("Ativar Disparos")
  - Seletor de instância (mostrando nome real + telefone)
  - Textarea para `whatsapp_template` com nota sobre `{{client_name}}` e `{{nps_link}}`
  - Botão "Enviar Pesquisa Agora": **disabled** se `whatsapp_enabled === false` OU sem instância
  - `handleSendSurvey` verifica `settings?.whatsapp_enabled` antes de executar
  - Mensagem construída substituindo `{{client_name}}` e `{{nps_link}}` no template
- **Aba "Personalizar"**:
  - Inputs para `survey_title`, `survey_message`, `main_question`
  - 3 inputs coloridos para feedback (promotor/neutro/detrator)
  - Botão "Salvar Personalização" → UPDATE em `nps_settings` + `toast.success("Configurações atualizadas com sucesso!")`
- **Aba "Configurações"**: Frequência + toggle auto_send

O `saveSettings` mutation será expandido para aceitar todos os novos campos.

## 3. PublicNPSSurvey.tsx — Textos Dinâmicos

- Após validar o token, buscar `nps_settings` da agência:
  ```typescript
  const { data: agencySettings } = await anonClient
    .from("nps_settings")
    .select("survey_title, survey_message, main_question, feedback_label_promoter, feedback_label_neutral, feedback_label_detractor")
    .eq("agency_id", token.agency_id)
    .maybeSingle();
  ```
- Guardar num state `surveyConfig` com fallbacks para os defaults
- **GUARDRAIL 2**: Aplicar `.replace(/\{\{client_name\}\}/g, clientName)` nos campos `survey_title` e `survey_message`
- Substituir `getFeedbackConfig()` hardcoded para usar os labels da config
- Todos os textos estáticos do formulário passam a ser dinâmicos

## Ficheiros alterados

| Ficheiro | Acção |
|----------|-------|
| Migration SQL | ADD COLUMN x8 + RLS policy restritiva |
| `src/pages/NPSPage.tsx` | Refactor completo → 4 Tabs + lógica de save + trava WhatsApp |
| `src/pages/PublicNPSSurvey.tsx` | Buscar `nps_settings`, substituir hardcoded, `{{client_name}}` replace |

