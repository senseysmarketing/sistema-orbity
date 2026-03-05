

# Implementação do Sistema de Automação WhatsApp para CRM

Este é um projeto grande com banco de dados, 3 edge functions, componentes de UI para conexão e chat. Vou dividir em **3 fases** implementadas sequencialmente para evitar erros.

---

## Fase 1: Infraestrutura (Banco + Conexão WhatsApp)

### 1.1 Migração do Banco de Dados

Criar todas as tabelas necessárias conforme o documento:

```sql
-- Tabela de contas WhatsApp (conexão com Evolution API)
CREATE TABLE whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  api_url text NOT NULL,
  api_key text NOT NULL,
  status text DEFAULT 'disconnected', -- disconnected, connecting, connected
  phone_number text,
  qr_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id)
);

-- Conversas WhatsApp vinculadas a leads
CREATE TABLE whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  session_phone text,
  last_message_at timestamptz,
  last_message_is_from_me boolean,
  last_customer_message_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Mensagens espelhadas
CREATE TABLE whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  phone_number text,
  message_type text DEFAULT 'text',
  content text,
  is_from_me boolean DEFAULT false,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT whatsapp_messages_unique UNIQUE(account_id, message_id)
);

-- Controle de automação
CREATE TABLE whatsapp_automation_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES whatsapp_conversations(id),
  status text DEFAULT 'active', -- active, processing, paused, responded, finished
  current_phase text DEFAULT 'greeting',
  current_step_position integer DEFAULT 1,
  next_execution_at timestamptz,
  last_followup_sent_at timestamptz,
  conversation_state text DEFAULT 'new_lead',
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, lead_id)
);

-- Templates de mensagens automáticas
CREATE TABLE whatsapp_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  phase text NOT NULL, -- greeting, followup
  step_position integer NOT NULL DEFAULT 1,
  message_template text NOT NULL,
  delay_minutes integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices de performance
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(phone_number);
CREATE INDEX idx_automation_next_execution ON whatsapp_automation_control(next_execution_at)
  WHERE status = 'active';
CREATE INDEX idx_whatsapp_conversations_lead ON whatsapp_conversations(lead_id);

-- RLS
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_automation_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

-- Policies baseadas na agência (via account_id → agency_id)
-- + templates via agency_id direto
```

### 1.2 Componente de Conexão WhatsApp (Settings)

Novo componente `src/components/settings/WhatsAppIntegration.tsx` ao lado do Google Calendar na aba Integrações:
- Card com ícone WhatsApp, status de conexão
- Campos: URL da API Evolution, API Key, Nome da Instância
- Botão "Conectar" que exibe QR Code retornado pela Evolution API
- Status em tempo real (desconectado/conectando/conectado)
- Botão desconectar

### 1.3 Edge Function: `whatsapp-connect`

Gerencia conexão com Evolution API:
- Criar/verificar instância
- Obter QR Code
- Verificar status de conexão
- Desconectar instância

---

## Fase 2: Envio de Mensagens e Automação

### 2.1 Edge Function: `whatsapp-send`

Envia mensagens via Evolution API com:
- Salvamento da mensagem ANTES do webhook (idempotência via upsert)
- `message_id` com fallback para `crypto.randomUUID()`
- Atualização da conversa (`last_message_at`, `last_message_is_from_me`)

### 2.2 Edge Function: `whatsapp-webhook`

Recebe eventos da Evolution API:
- `messages.upsert` e `messages.update`
- Inserção idempotente via constraint `UNIQUE(account_id, message_id)`
- Atualiza `last_customer_message_at` quando mensagem é do cliente
- Detecta resposta do cliente e para automação

### 2.3 Edge Function: `process-whatsapp-queue`

Worker que roda periodicamente (invocado via cron ou chamada manual):
- Seleciona automações com `status = 'active'` e `next_execution_at <= now()`
- Lock otimista: update status para `processing` antes de executar
- Verifica se cliente respondeu antes de enviar follow-up
- Anti-loop: intervalo mínimo de 120 segundos
- Delay correto (nunca cumulativo)
- Avança `current_step_position` e `conversation_state`

### 2.4 Configuração de Templates no CRM Settings

Nova aba "WhatsApp" no `CRMSettings.tsx`:
- Gerenciador de templates de greeting (3 steps)
- Gerenciador de templates de follow-up (3 steps com delay em minutos)
- Variáveis suportadas: `{{nome}}`, `{{empresa}}`, etc.
- Toggle para ativar/desativar automação por padrão em novos leads

---

## Fase 3: Chat e Espelhamento no CRM

### 3.1 Aba de Conversa no LeadDetailsDialog

Nova aba "WhatsApp" dentro do dialog de detalhes do lead:
- Chat em tempo real com mensagens espelhadas
- Campo de envio manual de mensagem
- Indicador de status da automação (ativa/pausada/finalizada)
- Botão para pausar/retomar automação
- Histórico completo da conversa

### 3.2 Hook `useWhatsApp`

Hook centralizado para:
- Status da conexão WhatsApp da agência
- Enviar mensagem manual
- Consultar conversas e mensagens de um lead
- Iniciar/pausar automação
- Real-time subscription para novas mensagens

### 3.3 Indicador no Kanban/Lista

Badge visual nos cards de leads indicando:
- Automação ativa (ícone pulsante)
- Aguardando resposta
- Cliente respondeu
- Último contato WhatsApp

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar 5 tabelas + indexes + RLS |
| `src/components/settings/WhatsAppIntegration.tsx` | Criar (conexão QR Code) |
| `src/pages/Settings.tsx` | Adicionar WhatsApp ao grid de integrações |
| `src/hooks/useWhatsApp.tsx` | Criar hook centralizado |
| `supabase/functions/whatsapp-connect/index.ts` | Criar (gerenciar instância) |
| `supabase/functions/whatsapp-send/index.ts` | Criar (enviar mensagem) |
| `supabase/functions/whatsapp-webhook/index.ts` | Criar (receber eventos) |
| `supabase/functions/process-whatsapp-queue/index.ts` | Criar (worker automação) |
| `src/components/crm/WhatsAppTemplateManager.tsx` | Criar (templates) |
| `src/components/crm/CRMSettings.tsx` | Adicionar aba WhatsApp |
| `src/components/crm/WhatsAppChat.tsx` | Criar (chat no lead) |
| `src/components/crm/LeadDetailsDialog.tsx` | Adicionar aba WhatsApp |
| `supabase/config.toml` | Adicionar config das novas functions |

---

## Segurança

- API Key e URL da Evolution API armazenadas na tabela `whatsapp_accounts` (por agência, acessível apenas por membros)
- Webhook com verificação de origem
- RLS em todas as tabelas baseado em `agency_id`
- Anti-duplicação via constraints UNIQUE
- Anti-loop via janela mínima de 120s

Dada a complexidade, recomendo implementar em 3 mensagens separadas (uma por fase). Posso começar pela **Fase 1** (banco + conexão)?

