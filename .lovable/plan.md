

# Flow Cadence + Live Preview + 3 melhorias UX

## Verificações rápidas necessárias antes da implementação

1. **`profiles.phone`**: preciso confirmar se existe coluna de telefone em `profiles` (o plano fala em `user.phone || profiles.phone`).
2. **Spintax**: aplicar regex `/\{([^{}]+)\}/g` apenas em substrings sem `{{...}}` para não conflitar com variáveis. Estratégia: processar **primeiro** `{{var}}` → valor real, **depois** `{...|...}` → primeira opção.

## Implementação

### 1. `WhatsAppPreview` (interno)

```tsx
function renderPreview(text: string): string {
  // Etapa 1: substituir variáveis {{nome}}, {{empresa}}, etc.
  let out = text
    .replace(/\{\{nome\}\}/g, "Gabriel")
    .replace(/\{\{empresa\}\}/g, "Senseys")
    .replace(/\{\{email\}\}/g, "gabriel@senseys.com.br")
    .replace(/\{\{telefone\}\}/g, "(11) 99999-9999")
    .replace(/\{\{formulario:([^}]+)\}\}/g, (_, k) => `[${k.replace(/_/g, " ")}]`);
  
  // Etapa 2: Spintax {opção1|opção2|opção3} → primeira opção
  out = out.replace(/\{([^{}]+)\}/g, (_, opts) => opts.split('|')[0].trim());
  
  return out;
}
```

UI do balão:
- Wrapper "telemóvel": `bg-muted/30 rounded-2xl p-4`
- Header: avatar + "Gabriel" + status "online"
- Balão alinhado à direita: `bg-[#dcf8c6] dark:bg-[#005c4b] rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] ml-auto whitespace-pre-wrap`
- Timestamp + ✓✓ azul

### 2. Timeline com delay no conector

Estrutura de cada par de etapas:
```
●  Etapa 1
│
│  ⏱ Aguardar 1h         ← badge sobre a linha
│
●  Etapa 2
```

Render:
```tsx
{templates.map((t, i) => (
  <div key={t.id}>
    <TimelineNode template={t} active={...} onClick={...} />
    {i < templates.length - 1 && (
      <div className="relative flex items-center justify-center py-3 ml-3">
        <div className="absolute inset-y-0 left-0 border-l-2 border-dashed border-muted" />
        <Badge variant="outline" className="bg-background relative z-10 text-xs gap-1">
          <Clock className="h-3 w-3" />
          Aguardar {formatDelay(templates[i+1].delay_minutes)}
        </Badge>
      </div>
    )}
  </div>
))}
```

### 3. Botão "Enviar teste para mim"

Localização: dentro do card do Editor, ao lado do botão Salvar.

Lógica:
```tsx
const sendTest = useMutation({
  mutationFn: async () => {
    // 1. Buscar telefone do utilizador
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const phone = profile?.phone;
    if (!phone) throw new Error('Configure seu telefone no perfil para receber testes');
    
    // 2. Renderizar preview (com variáveis + spintax) para enviar conteúdo realista
    const renderedMessage = renderPreview(activeTemplate.content);
    
    // 3. Chamar whatsapp-send via hook existente
    await sendMessage.mutateAsync({
      phone_number: phone,
      message: `🧪 [TESTE] ${renderedMessage}`,
    });
  },
  onSuccess: () => toast({ title: 'Mensagem de teste enviada!' }),
  onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
});
```

UI: `<Button variant="outline" size="sm"><Send className="h-4 w-4 mr-2" />Enviar teste para mim</Button>`

Disabled quando: sem `activeTemplate`, sem conta WhatsApp conectada, ou conteúdo vazio.

### 4. Layout final

```
┌──────────────────────────────────────────────────────────┐
│ Header + Badges (Pausa auto + Anti-Bot)                  │
├──────────────────────────────────────────────────────────┤
│ SendingSchedule + AllowedSources (grid 2)                │
├──────────────────────────────────────────────────────────┤
│ Tabs: [Saudação] [Follow-up]                             │
│ ┌────────────┬───────────────────────────────────┐       │
│ │ col-span-4 │ col-span-8                        │       │
│ │            │                                   │       │
│ │ Timeline   │ ┌─ Editor ────────────────────┐   │       │
│ │ ● Etapa 1  │ │ Textarea + variáveis        │   │       │
│ │ │⏱ 1h     │ │ Delay + Switch              │   │       │
│ │ ● Etapa 2  │ │ [Enviar teste] [Salvar]     │   │       │
│ │ │⏱ 24h    │ └─────────────────────────────┘   │       │
│ │ ● Etapa 3  │                                   │       │
│ │ + Add      │ ┌─ 📱 Live Preview ───────────┐   │       │
│ │            │ │ [Avatar] Gabriel · online   │   │       │
│ │            │ │           ┌──────────────┐  │   │       │
│ │            │ │           │ Olá Gabriel! │  │   │       │
│ │            │ │           └──────────────┘  │   │       │
│ │            │ │                  10:42 ✓✓   │   │       │
│ │            │ └─────────────────────────────┘   │       │
│ └────────────┴───────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

## Guardrails

| # | Garantia | Como |
|---|----------|------|
| 1 | Spintax não interfere com variáveis | Processamento em 2 etapas: `{{var}}` antes de `{spintax}` |
| 2 | Telefone ausente | Toast claro "Configure seu telefone no perfil" |
| 3 | Mensagem teste identificável | Prefixo `🧪 [TESTE]` |
| 4 | Variáveis reais | Usa `{{nome}}`/`{{empresa}}` (sistema real) |
| 5 | Timeline temporal clara | Badge `⏱ Aguardar Xh` no conector vertical |
| 6 | Sem perda de feature | VariableInserter, delay, switch ativo, save preservados |
| 7 | Empty states | Timeline vazia → CTA "+ Adicionar primeira etapa"; sem ativo → placeholder |

## Confirmação prévia

Antes de codar, vou abrir `WhatsAppTemplateManager.tsx` completo + verificar `profiles.phone` no schema. Se a coluna não existir, uso `whatsapp_accounts.phone_number` da agência como fallback (envio para o próprio número conectado, útil para teste técnico).

## Ficheiro alterado
- `src/components/crm/WhatsAppTemplateManager.tsx` (refatoração completa, ~400 linhas)

Sem migration. Sem mudança em queries/hooks.

