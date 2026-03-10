

# Fix: Webhook não recebe mensagens + Pausar automação do Roberto

## Problema
A Evolution API não está enviando eventos para a edge function `whatsapp-webhook`. As respostas do Roberto Seguro nunca foram detectadas, e a automação continua ativa — vai enviar follow-up 2 amanhã.

## Ações

### 1. Pausar automação do Roberto (imediato via SQL)
Atualizar o `whatsapp_automation_control` para `status: 'responded'` e `conversation_state: 'customer_replied'`, evitando que mais follow-ups sejam enviados.

### 2. Reconfigurar webhook na Evolution API
Invocar a edge function `whatsapp-connect` com `action: 'status'` para a instância Senseys. Essa action já chama `configureWebhook()` automaticamente (auto-cura), reconfigurando o endpoint `POST /webhook/set/Senseys` na Evolution.

### 3. Validar que o webhook foi configurado
Após a reconfiguração, testar enviando uma mensagem de teste ao WhatsApp e verificar se os logs do `whatsapp-webhook` registram o evento.

### Arquivos alterados
Nenhum arquivo de código precisa ser alterado. São ações operacionais via queries SQL e invocação de edge function.

