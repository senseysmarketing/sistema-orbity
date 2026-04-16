

# OTP via WhatsApp — CompanyDataStep.tsx

## Alterações no ficheiro `src/components/onboarding/CompanyDataStep.tsx`

### 1. Importações
- Adicionar `useEffect, useCallback, useRef` do React
- Adicionar `InputOTP, InputOTPGroup, InputOTPSlot` de `@/components/ui/input-otp`
- Adicionar `toast` de `sonner`
- Adicionar ícones: `Loader2, ShieldCheck, RefreshCw, LifeBuoy, ArrowLeft, MessageCircle`

### 2. Schema — Telefone obrigatório
- Alterar `contactPhone` de `optional()` para `z.string().min(14, 'WhatsApp obrigatório para validação')`
- Marcar label com `*`

### 3. Novos estados
```
showOtp, otpCode, generatedCode, countdown (60), isSendingOtp
```

### 4. Função `generateAndSendOTP(phone)`
- **Guardrail 1**: `setIsSendingOtp(true)` antes do fetch
- Gera código 6 dígitos aleatório
- Limpa telefone (só dígitos)
- POST para `https://senseys-n8n.cloudfy.cloud/webhook/validador-orbity` com `{ phone, code }`
- **Se `response.ok`**: guarda código, inicia countdown, `setShowOtp(true)`
- **Se falhar**: `toast.error("Erro ao contactar o servidor...")`, mantém no formulário
- `finally`: `setIsSendingOtp(false)`

### 5. Interceptar handleSubmit
- Após validação zod bem-sucedida, chama `generateAndSendOTP` em vez de `nextStep()`

### 6. useEffect countdown
- Decrementa a cada segundo quando `showOtp && countdown > 0`

### 7. useEffect verificação OTP
- Quando `otpCode.length === 6`:
  - Match → `toast.success`, `updateCompanyData`, `nextStep()`
  - Falha → `toast.error`, limpa `otpCode`

### 8. Renderização condicional

**Formulário (showOtp === false)**:
- Formulário actual + nota sob campo telefone: "Insira um WhatsApp válido..."
- Botão submit: se `isSendingOtp` → `<Loader2 spinning />` + "A enviar código..."
- Botão disabled durante `isSendingOtp`

**Ecrã OTP (showOtp === true)**:
- Card com ícone `ShieldCheck` verde
- Título + subtítulo com número formatado
- `InputOTP maxLength={6}` com 6 slots — **disabled durante `isSendingOtp`** (Guardrail 2)
- Botão "Reenviar código" — disabled se `countdown > 0` OU `isSendingOtp` (Guardrail 2)
- Botão "Preciso de ajuda" → `https://wa.me/5516988891234`
- Botão "Alterar número" → `setShowOtp(false)`, reset countdown

### Guardrails aplicados

| # | Guardrail | Implementação |
|---|-----------|---------------|
| 1 | Loading estrito | `isSendingOtp` bloqueia botão, transição só após `response.ok` |
| 2 | Anti-spam reenvio | `isSendingOtp` desativa botão reenvio + input OTP durante fetch |

Ficheiro único alterado: `src/components/onboarding/CompanyDataStep.tsx`

