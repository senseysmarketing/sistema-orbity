## Diagnóstico

Olhando o print, o card "Logística de Voo" mostra o remetente como `<contato@senseys.com.br>` — sem nome antes do `<...>`. Isso bate exatamente com o template do `SenderSelect`:

```tsx
{sender.name} <{sender.email}>
```

Ou seja, o remetente cadastrado na SendPulse veio com `name` vazio (só com email). Quando você seleciona, o `onSelect` faz:

```ts
setCampaign(prev => ({ ...prev, sender_email: sender.email, sender_name: sender.name }))
```

`sender_name` vira string vazia. Já a validação em `handleSendCampaign` exige todos os campos truthy:

```ts
if (!sender_name || !sender_email || !subject || !body || !book_id) {
  toast.error("Preencha todos os campos da campanha");
}
```

Como `sender_name === ""`, a validação dispara o toast — mesmo com tudo o resto preenchido. **Não há campo oculto na UI**, é o `sender_name` em branco vindo da SendPulse que bloqueia o envio.

Confirmações no print:
- Assunto: "Teste Senseys" ✅
- Lista: "Teste ()" ✅ (book_id selecionado)
- Remetente: aparece só `<contato@senseys.com.br>` → name vazio ❌
- Body: o preview à esquerda está renderizando ✅

## Correção proposta

Pequeno ajuste de UX, sem mexer em backend:

### 1. `src/pages/EmailMarketing.tsx` — `SenderSelect.onSelect` (linha ~317)
Garantir um nome derivado quando a SendPulse retornar `name` vazio:

```ts
onSelect={(sender) =>
  setCampaign(prev => ({
    ...prev,
    sender_email: sender.email,
    sender_name: sender.name?.trim() || sender.email.split("@")[0],
  }))
}
```

### 2. `SenderSelect` render (linha 570)
Mostrar fallback no dropdown também, para o usuário entender o que está selecionando:

```tsx
{(sender.name?.trim() || sender.email.split("@")[0])} &lt;{sender.email}&gt;
```

### 3. `handleSendCampaign` (linha 127) — validação mais útil
Trocar a checagem genérica por mensagens específicas, e tratar `sender_name` como opcional (já temos fallback):

```ts
if (!campaign.sender_email) return toast.error("Selecione um remetente verificado");
if (!campaign.subject?.trim()) return toast.error("Informe o assunto da campanha");
if (!campaign.book_id) return toast.error("Selecione a lista de destino");
if (!campaign.body || campaign.body === "<p></p>") return toast.error("O conteúdo do e-mail está vazio");
```

Aplicar o mesmo refinamento na validação do botão "Enviar E-mail de Teste" (linha 423) só para `sender_email`/`subject`/`body`.

## Fora de escopo
- Não vamos alterar o cadastro de remetentes na SendPulse, nem a Edge Function `sendpulse-api`.
- Não vamos mexer no `CampaignBuilder` nem na lógica de cache do React Query.

## Resultado
Após a correção, ao clicar em **Disparar Campanha Agora** com os campos atuais do print, a campanha será enviada normalmente — e, caso falte algo no futuro, o toast dirá exatamente qual campo.
