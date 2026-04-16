

# Mostrar número do WhatsApp em vez do nome da instância

## Investigação necessária
<lov-tool-use id="toolu_vrtx_01SVGTQQQRY1WEMBdjcmoeqx" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/settings/WhatsAppInstanceCard.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BNhSrLccsrme5RunnVyzFM" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/settings/WhatsAppInstanceCard.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01EuB5ap9sK3kRAEemvgeG57" name="code--search_files" integration-id="code" data="{\"query\": \"WhatsApp da Agência\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013CYHCbghLJLBPSAmQHYiPZ" name="code--search_files" integration-id="code" data="{\"query\": \"Instância para NPS\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_012RaqDyKgByDztiKryo1q6C" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/NPSPage.tsx\", \"lines\": \"440-510\"}">
</lov-tool-use>
I have all I need. The phone number is already available via `account.phone_number` and `inst.phone_number`. Just need to swap the display priority.

<lov-plan>

# Mostrar número de telefone em vez de nome da instância

Substituir todas as referências visuais ao `instance_name` pelo `phone_number` conectado em três pontos:

## 1. `src/components/settings/WhatsAppInstanceCard.tsx` (linhas 159-164)

**Antes:** mostra "Instância: orbity_7bef1258" como linha primária e telefone como secundário.

**Depois:** mostrar telefone como linha primária formatada. Se não houver número ainda (ex: instância recém-conectada antes do webhook popular), fallback discreto para "Aguardando número...".

```tsx
<p className="text-xs sm:text-sm text-muted-foreground truncate">
  {account?.phone_number 
    ? `Número: ${formatPhoneDisplay(account.phone_number)}`
    : "Aguardando número conectado..."}
</p>
```

Helper `formatPhoneDisplay` aplica máscara BR `+55 (16) 99448-1535` ao número cru retornado pela Evolution API.

## 2. `src/components/admin/BillingAutomationSettings.tsx` (linha 182)

**Antes:** `Conectado como: {account?.phone_number || 'WhatsApp da Agência'}`

**Depois:** `Conectado como: {formatPhoneDisplay(account?.phone_number) || 'Aguardando número...'}` — remove fallback genérico, usa máscara consistente.

## 3. `src/pages/NPSPage.tsx` (linhas 467-478)

**Select (múltiplas instâncias)** e **display single** atualmente mostram `instance_name (phone)`.

**Depois:** mostrar apenas `phone_number` formatado. Se ausente, fallback para o instance_name (edge case).

```tsx
// Select item
{inst.phone_number ? formatPhoneDisplay(inst.phone_number) : inst.instance_name}

// Single instance display  
<span className="font-medium">
  {whatsappInstances[0].phone_number 
    ? formatPhoneDisplay(whatsappInstances[0].phone_number)
    : whatsappInstances[0].instance_name}
</span>
```

## Helper compartilhado

Criar `src/lib/formatPhoneDisplay.ts`:
```ts
export const formatPhoneDisplay = (raw?: string | null): string => {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  // BR com DDI: 5516994481535 → +55 (16) 99448-1535
  if (digits.startsWith("55") && digits.length === 13) {
    return `+55 (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith("55") && digits.length === 12) {
    return `+55 (${digits.slice(2,4)}) ${digits.slice(4,8)}-${digits.slice(8)}`;
  }
  return raw;
};
```

## Ficheiros alterados
- `src/lib/formatPhoneDisplay.ts` (novo)
- `src/components/settings/WhatsAppInstanceCard.tsx`
- `src/components/admin/BillingAutomationSettings.tsx`
- `src/pages/NPSPage.tsx`

Sem migration, sem alteração de hooks. Apenas substituição visual.

