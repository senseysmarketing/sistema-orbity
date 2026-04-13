

# Baixa Sincronizada com Gateway no PaymentSheet

## Resumo
Adicionar ao `PaymentSheet.tsx` um fluxo de "Dar Baixa" com `MarkAsPaidPopover` no rodapé, que detecta se a cobrança possui vínculo com gateway (Asaas/Conexa) e oferece sincronização via modal antes de confirmar.

## Alterações no `PaymentSheet.tsx` (único arquivo)

### 1. Imports
- Adicionar `import { MarkAsPaidPopover } from "./CommandCenter/MarkAsPaidPopover";`
- Adicionar `CheckCircle` ao import do lucide-react

### 2. Novo estado para o sync dialog
```ts
const [syncDialogOpen, setSyncDialogOpen] = useState(false);
const [pendingSettlement, setPendingSettlement] = useState<{ paidDate: string; paidAmount: number } | null>(null);
```

### 3. Função `handleManualSettlement`
```ts
const handleManualSettlement = async (paidDate: string, paidAmount: number) => {
  if (!payment) return;
  
  // Se tem gateway vinculado → abrir dialog de sincronização
  if (hasAsaasCharge || hasConexaCharge) {
    setPendingSettlement({ paidDate, paidAmount });
    setSyncDialogOpen(true);
    return;
  }
  
  // Sem gateway → baixa local direta
  await executeLocalSettlement(paidDate, paidAmount);
};
```

### 4. Função `executeLocalSettlement` (baixa apenas local)
```ts
const executeLocalSettlement = async (paidDate: string, paidAmount: number) => {
  setLoading(true);
  try {
    const { error } = await supabase.from("client_payments")
      .update({ status: "paid", paid_date: paidDate, amount_paid: paidAmount })
      .eq("id", payment.id);
    if (error) throw error;
    toast({ title: "✅ Baixa registrada", description: "Pagamento confirmado no Orbity." });
    onSuccess();
    onOpenChange(false);
  } catch (err: any) {
    toast({ title: "Erro", description: err.message, variant: "destructive" });
  } finally {
    setLoading(false);
  }
};
```

### 5. Função `handleSyncSettlement` (baixa local + gateway)
```ts
const handleSyncSettlement = async () => {
  if (!pendingSettlement || !payment) return;
  setLoading(true);
  try {
    // TODO: Integrar chamada para Edge Function settle-gateway-payment
    // await supabase.functions.invoke('settle-gateway-payment', { body: { paymentId: payment.id, ... } });
    
    // Por ora, executa apenas a baixa local
    await executeLocalSettlement(pendingSettlement.paidDate, pendingSettlement.paidAmount);
  } finally {
    setSyncDialogOpen(false);
    setPendingSettlement(null);
  }
};
```

### 6. MarkAsPaidPopover no rodapé (dentro do bloco de Actions, após WhatsApp)
Renderizar apenas quando `isEditing && (status === 'pending' || status === 'overdue')`:
```tsx
<MarkAsPaidPopover
  originalAmount={totalAmount}
  isLoading={loading}
  onConfirm={handleManualSettlement}
>
  <Button type="button" variant="outline" className="w-full text-green-600">
    <CheckCircle className="h-4 w-4 mr-1" />
    Dar Baixa Manual
  </Button>
</MarkAsPaidPopover>
```

### 7. Novo AlertDialog de Sincronização (após os dialogs existentes)
```tsx
<AlertDialog open={syncDialogOpen} onOpenChange={(o) => { if (!o) { setSyncDialogOpen(false); setPendingSettlement(null); } }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Sincronizar com Gateway?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta cobrança está vinculada ao {hasAsaasCharge ? 'Asaas' : 'Conexa'}. 
        Deseja que o Orbity confirme o recebimento manual também no gateway? 
        Isso evitará que o banco continue cobrando o cliente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
      <AlertDialogCancel>Voltar</AlertDialogCancel>
      <Button variant="outline" onClick={() => { executeLocalSettlement(...); setSyncDialogOpen(false); }}>
        Apenas no Orbity
      </Button>
      <AlertDialogAction onClick={handleSyncSettlement} disabled={loading}>
        Sim, baixar no Banco
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Arquivos modificados
- `src/components/admin/PaymentSheet.tsx` (único arquivo)

## Sem migration
Nenhuma alteração de schema necessária. A Edge Function `settle-gateway-payment` será implementada numa etapa posterior (marcada com TODO).

