
# Implementação: Alterar Senha do Usuário

## Situação Atual

A função `updatePassword` em `Settings.tsx` (linha 112) apenas exibe um toast de "funcionalidade em desenvolvimento":

```typescript
const updatePassword = async () => {
  try {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A alteração de senha será implementada em breve.",
    });
  } catch (error: any) { ... }
};
```

Porém, **já existe uma edge function** `update-user-password` pronta que faz exatamente isso usando a Admin API do Supabase.

---

## Solução

Criar um **Dialog** para alteração de senha com:
- Campo de nova senha
- Campo de confirmação de senha
- Validação de força de senha (mínimo 6 caracteres)
- Chamada à edge function existente

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Settings.tsx` | Adicionar estados para o dialog, campos de senha, e implementar a função `updatePassword` para chamar a edge function |

---

## Implementação Técnica

### 1. Novos Estados no Settings.tsx

```typescript
const [showPasswordDialog, setShowPasswordDialog] = useState(false);
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [updatingPassword, setUpdatingPassword] = useState(false);
```

### 2. Função updatePassword Implementada

```typescript
const updatePassword = async () => {
  // Validações
  if (!newPassword || !confirmPassword) {
    toast({
      title: "Campos obrigatórios",
      description: "Preencha a nova senha e a confirmação.",
      variant: "destructive",
    });
    return;
  }

  if (newPassword !== confirmPassword) {
    toast({
      title: "Senhas não coincidem",
      description: "A nova senha e a confirmação devem ser iguais.",
      variant: "destructive",
    });
    return;
  }

  if (newPassword.length < 6) {
    toast({
      title: "Senha muito curta",
      description: "A senha deve ter pelo menos 6 caracteres.",
      variant: "destructive",
    });
    return;
  }

  try {
    setUpdatingPassword(true);
    
    const { data, error } = await supabase.functions.invoke('update-user-password', {
      body: {
        target_user_id: userProfile?.user_id,
        new_password: newPassword,
        agency_id: currentAgency?.id,
      }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    toast({
      title: "Senha alterada!",
      description: "Sua senha foi atualizada com sucesso.",
    });

    // Limpar campos e fechar dialog
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordDialog(false);
  } catch (error: any) {
    toast({
      title: "Erro ao alterar senha",
      description: error.message || "Tente novamente.",
      variant: "destructive",
    });
  } finally {
    setUpdatingPassword(false);
  }
};
```

### 3. Dialog de Alteração de Senha

```tsx
<Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Alterar Senha</DialogTitle>
      <DialogDescription>
        Digite sua nova senha. Ela deve ter pelo menos 6 caracteres.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nova Senha</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="Digite a nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar Senha</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Confirme a nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
        Cancelar
      </Button>
      <Button onClick={updatePassword} disabled={updatingPassword}>
        {updatingPassword ? 'Salvando...' : 'Alterar Senha'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. Botão que Abre o Dialog

Alterar o botão existente (linha 369) para abrir o dialog em vez de chamar a função diretamente:

```tsx
<Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
  <Lock className="mr-2 h-4 w-4" />
  Alterar Senha
</Button>
```

---

## Imports Necessários

Adicionar imports do Dialog:

```typescript
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

---

## Fluxo do Usuário

1. Usuário clica em "Alterar Senha" na aba Conta
2. Dialog abre pedindo nova senha e confirmação
3. Usuário preenche os campos
4. Clica em "Alterar Senha"
5. Sistema valida:
   - Campos preenchidos
   - Senhas iguais
   - Mínimo 6 caracteres
6. Chama edge function `update-user-password`
7. Exibe toast de sucesso e fecha dialog

---

## Segurança

A edge function já implementa:
- Verificação de autenticação via token JWT
- Verificação se o usuário pertence à agência
- Uso da Admin API do Supabase (service role) para alterar senha

O usuário só pode alterar sua própria senha (ou admins podem alterar de outros usuários da mesma agência).
