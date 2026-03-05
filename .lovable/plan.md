

# Correção da Conexão WhatsApp + Detecção Automática de Status

## Diagnóstico

O erro "Failed to send a request to the Edge Function" ocorre por dois motivos:

1. **CORS incompleto**: Os headers CORS na edge function estão faltando os headers obrigatórios do Supabase client (`x-supabase-client-platform`, `x-supabase-client-platform-version`, `x-supabase-client-runtime`, `x-supabase-client-runtime-version`). O preflight OPTIONS falha e o browser bloqueia a request.

2. **Possível timeout**: A edge function faz chamadas externas à Evolution API que podem demorar, mas o CORS é o problema principal.

## Correções

### 1. Edge Function `whatsapp-connect/index.ts`
- Corrigir os CORS headers para incluir todos os headers necessários do Supabase client
- Adicionar tratamento melhorado de erros nas chamadas à Evolution API

### 2. Edge Functions `whatsapp-send`, `whatsapp-webhook`, `process-whatsapp-queue`
- Mesma correção de CORS em todas as edge functions

### 3. Componente `WhatsAppIntegration.tsx`
- Ao carregar, se já existe uma conta salva mas status não é "connected", automaticamente verificar status via Evolution API
- Se status for "disconnected", automaticamente buscar novo QR code para conectar
- Se status for "connected", mostrar as informações de conexão
- Melhorar tratamento de erro na UI com mensagens mais descritivas

### 4. Hook `useWhatsApp.tsx`
- Adicionar auto-check de status ao carregar a conta (quando account existe mas não está connected)

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/whatsapp-connect/index.ts` | Corrigir CORS headers |
| `supabase/functions/whatsapp-send/index.ts` | Corrigir CORS headers |
| `supabase/functions/whatsapp-webhook/index.ts` | Corrigir CORS headers |
| `supabase/functions/process-whatsapp-queue/index.ts` | Corrigir CORS headers |
| `src/components/settings/WhatsAppIntegration.tsx` | Auto-detecção de status + auto QR code |
| `src/hooks/useWhatsApp.tsx` | Auto-check status ao carregar |

