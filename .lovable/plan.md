

# Correção Crítica: Bloquear Acesso de Usuários Sem Agência

## Problema Identificado

Quando um administrador remove um usuário da agência, o sistema:

1. **Remove apenas** o registro em `agency_users` (vínculo usuário-agência)
2. **NÃO remove** o usuário de:
   - `auth.users` (pode continuar fazendo login)
   - `profiles` (mantém perfil ativo)

**Consequência**: O usuário excluído consegue fazer login e acessar o interior do sistema, mesmo sem estar vinculado a nenhuma agência.

---

## Análise do Fluxo Atual

```text
┌────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│     Auth.tsx       │────▶│    AppLayout     │────▶│   PaymentWrapper    │
│  (verifica login)  │     │ (verifica user)  │     │ (verifica plano)    │
└────────────────────┘     └──────────────────┘     └─────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
    user existe?             user existe?              tem subscription?
         │                         │                         │
         │ SIM                     │ SIM                     │ ??? 
         ▼                         ▼                         ▼
    redirect to              render layout            NENHUMA verificação
     /dashboard                                       se tem agência!
```

**O problema**: Ninguém verifica se o usuário pertence a alguma agência.

---

## Solução Proposta

### Abordagem 1: Verificação no Frontend (Rápida, mas superficial)

Adicionar verificação no `useAgency` e `AppLayout` para bloquear usuários sem agência.

### Abordagem 2: Tela de "Sem Acesso" dedicada (Recomendada)

Criar uma tela específica para usuários sem agência, explicando a situação e oferecendo opções.

---

## Implementação Detalhada

### 1. Modificar `useAgency.tsx`

Adicionar um flag para indicar que o usuário não pertence a nenhuma agência:

```typescript
interface AgencyContextType {
  // ... existentes
  hasNoAgency: boolean;  // Novo: indica se usuário não tem agência
}

// Na função fetchUserAgencies:
const fetchUserAgencies = async () => {
  if (!user) return;

  try {
    setLoading(true);
    const { data: agencyUsers, error } = await supabase
      .from('agency_users')
      .select('*, agencies (*)')
      .eq('user_id', user.id);

    if (agencyUsersError) throw agencyUsersError;

    const agencies = agencyUsers?.map(au => au.agencies).filter(Boolean) || [];
    setUserAgencies(agencies);
    setHasNoAgency(agencies.length === 0);  // Novo

    // ... resto do código
  } finally {
    setLoading(false);
  }
};
```

### 2. Criar componente `NoAgencyScreen.tsx`

```typescript
// src/components/agency/NoAgencyScreen.tsx
export function NoAgencyScreen() {
  const { signOut } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <Building2 className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl text-orange-800">
            Acesso Não Disponível
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Sua conta não está vinculada a nenhuma agência. 
            Isso pode acontecer se você foi removido de uma agência 
            ou se sua conta foi desativada.
          </p>
          
          <div className="space-y-2">
            <Button onClick={signOut} variant="destructive" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com o 
            administrador da sua agência ou com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Modificar `AppLayout.tsx`

Adicionar verificação de agência após loading:

```typescript
export function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { loading: agencyLoading, hasNoAgency, userAgencies } = useAgency();
  
  // Loading states
  if (authLoading || agencyLoading) {
    return <LoadingSpinner />;
  }

  // Não autenticado -> redireciona para login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Autenticado mas sem agência -> mostra tela de bloqueio
  if (hasNoAgency || userAgencies.length === 0) {
    return <NoAgencyScreen />;
  }

  // Normal flow...
  return (
    <SidebarProvider>
      {/* ... */}
    </SidebarProvider>
  );
}
```

### 4. Limpar localStorage na remoção

No `useAgency.tsx`, ao detectar que não há agências, limpar o ID salvo:

```typescript
if (agencies.length === 0) {
  localStorage.removeItem('currentAgencyId');
}
```

---

## Fluxo Corrigido

```text
┌────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│     Auth.tsx       │────▶│    AppLayout     │────▶│   PaymentWrapper    │
│  (verifica login)  │     │ (verifica user)  │     │ (verifica plano)    │
└────────────────────┘     │ (verifica agência)│    └─────────────────────┘
         │                 └──────────────────┘              
         ▼                         │                         
    user existe?             user existe?                    
         │                         │                         
         │ SIM                     │ SIM                     
         ▼                         ▼                         
    redirect to              tem agência?                    
     /dashboard                    │                         
                                   │ NÃO                     
                                   ▼                         
                           NoAgencyScreen                    
                         "Acesso Não Disponível"             
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/hooks/useAgency.tsx` | Adicionar `hasNoAgency` flag, limpar localStorage |
| `src/components/agency/NoAgencyScreen.tsx` | Novo componente para exibir bloqueio |
| `src/components/layout/AppLayout.tsx` | Verificar se usuário tem agência antes de renderizar |

---

## Comportamento Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Usuário removido tenta login | Entra no sistema (vazio/quebrado) | Vê "Acesso Não Disponível" |
| Usuário removido na sessão | Continua usando | Ao recarregar, vê bloqueio |
| Usuário nunca teve agência | Entra no sistema | Vê "Acesso Não Disponível" |

---

## Considerações de Segurança

1. **RLS continua protegendo dados**: Mesmo se alguém burlar o frontend, as políticas RLS impedem acesso a dados de agências.

2. **Esta é uma correção de UX/Frontend**: O objetivo é dar feedback claro ao usuário, não é a única linha de defesa.

3. **Opção futura**: Desativar completamente o usuário no `auth.users` ao removê-lo da última agência (requer edge function com service role).

