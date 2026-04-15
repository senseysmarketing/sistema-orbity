

# Integrar webhook n8n no DemoSchedulingModal

## Alteração única

### `src/components/landing/DemoSchedulingModal.tsx`
- Inserir bloco `try/catch` isolado após a linha 84 (após o `await supabase.from('orbity_leads').insert(...)`) e antes do `setDirection(1)`
- O bloco faz `fetch POST` para `https://senseys-n8n.cloudfy.cloud/webhook/apresentacao-orbity` com o payload especificado
- Em caso de falha, apenas `console.error` — fluxo continua para step 3

### Verificação de imports
- `format` e `ptBR` já importados (linhas 10-11) ✓
- `rawPhone` já definida no ficheiro (linha 22) ✓

### Código a inserir (entre linhas 84 e 86)
```typescript
// Disparar Webhook para o n8n (não-bloqueante)
try {
  await fetch('https://senseys-n8n.cloudfy.cloud/webhook/apresentacao-orbity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      phone: rawPhone(phone),
      agency_name: agencyName.trim(),
      scheduled_at: scheduledAt.toISOString(),
      formatted_date: format(selectedDate, "dd/MM/yyyy", { locale: ptBR }),
      formatted_hour: `${selectedHour.toString().padStart(2, "0")}:00`
    }),
  });
} catch (webhookError) {
  console.error('Erro ao disparar webhook do n8n:', webhookError);
}
```

Nenhum outro ficheiro alterado.

