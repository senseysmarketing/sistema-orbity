

# Auto-importar formulários Meta desconhecidos no webhook

## Problema
Quando um lead chega via webhook de um formulário novo (que foi alterado ou criado no Meta), o sistema não encontra integração correspondente. Se existe integração "all", o lead é criado mas o formulário não aparece na aba de Qualificação. Se não existe integração nenhuma, o lead é descartado.

## Solução
No webhook handler (`facebook-leads/index.ts`), quando não existe integração exata para o `form_id` recebido, auto-criar um registro em `facebook_lead_integrations` para esse formulário, usando a integração "all" como template (ou a conexão da página). O registro é criado com `form_questions: null`, o que faz o frontend mostrar o badge "Pendente" automaticamente.

## Alterações

### 1. `supabase/functions/facebook-leads/index.ts` (webhook handler, ~linha 729-756)

Após tentar o match exato e o fallback "all", adicionar lógica de auto-criação:

- Se encontrou "all" mas não exato: usar o "all" para processar o lead E criar um novo registro de integração para o form_id específico
- Se não encontrou nenhum: buscar qualquer integração ativa da página para obter `connection_id` e `created_by`, criar o registro e processar o lead
- O novo registro terá: `form_name` obtido da API do Meta (já temos o `leadData` com `form_id`), `form_questions: null`, `default_status` herdado
- Buscar o nome do formulário via Graph API: `GET /{form_id}?fields=name&access_token=...`

Fluxo simplificado:
```
1. Tentar match exato → usar se encontrou
2. Se não, tentar "all" → usar como template
3. Se achou "all" ou qualquer integração da página:
   a. Buscar form_name via Meta API
   b. INSERT em facebook_lead_integrations (form_id específico, form_questions=null)
   c. Continuar processamento normal do lead
4. Se nenhuma integração da página existe → skip (sem conexão, impossível processar)
```

### 2. Nenhuma alteração no frontend
O `LeadScoringConfig.tsx` já expande formulários individuais e mostra badge "Pendente" quando `form_questions` é null. A auto-criação do registro é suficiente para que o formulário apareça na aba.

## Resultado
- Formulários novos/alterados do Meta aparecem automaticamente na aba de Qualificação com badge "Pendente"
- Leads continuam sendo capturados normalmente
- Usuário só precisa configurar as regras de scoring, sem precisar importar manualmente

