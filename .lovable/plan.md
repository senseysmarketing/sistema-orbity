
# Link Personalizado de Onboarding para Novas Agencias

## Fluxo Completo

```text
Master cadastra agencia (nome, email, whatsapp, valor)
        │
        ▼
Sistema cria agencia (sem usuario) + gera token unico
        │
        ▼
Master recebe link copiavel: /register?token=abc123
        │
        ▼
Master envia link manualmente (WhatsApp, email, etc)
        │
        ▼
Dono da agencia clica no link → Tela de Registro
  - Campos pre-preenchidos: nome da agencia, email
  - Preenche: senha, confirmar senha, telefone (se quiser)
        │
        ▼
Conta criada → Redireciona para /auth (login)
        │
        ▼
Apos login, detecta que e primeiro acesso sem pagamento
  → Exibe tela/modal pedindo para realizar pagamento Stripe
        │
        ▼
Completa pagamento → Acesso liberado ao dashboard
```

## Banco de Dados

### Tabela `agency_invites`
```sql
CREATE TABLE public.agency_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);
```
- RLS: master admins podem ler/criar; anon pode SELECT por token (para a pagina de registro)

## Arquivos a Criar

### 1. `src/pages/RegisterByInvite.tsx`
- Rota: `/register?token=xxx`
- Ao montar, busca dados do invite pelo token (agency name, email, owner name)
- Exibe formulario com campos pre-preenchidos (email readonly) + campo de senha
- Ao submeter: chama edge function que cria o usuario, associa a agencia, e marca o invite como usado
- Redireciona para `/auth` com toast "Conta criada! Faca login"

### 2. `supabase/functions/complete-invite/index.ts`
- Recebe: token, password, phone (opcional)
- Valida token (existe, nao usado, nao expirado)
- Cria usuario via `auth.admin.createUser` com email do invite
- Associa usuario a agencia via `agency_users`
- Marca invite como usado (`used_at = now()`)
- Retorna sucesso

## Arquivos a Modificar

### 3. `src/components/master/CreateAgencyDialog.tsx`
- Remover chamada a `agency-onboarding` edge function
- Nova logica: criar agencia diretamente + inserir registro em `agency_invites`
- Apos criar, exibir o link copiavel em um dialog de sucesso com botao "Copiar Link"
- Toast: "Agencia criada! Envie o link de cadastro para o responsavel"

### 4. `src/App.tsx`
- Adicionar rota `/register` apontando para `RegisterByInvite`

### 5. `src/components/payment/PaymentMiddlewareWrapper.tsx`
- Adicionar checagem: se usuario logado nao tem pagamento ativo e e primeiro acesso, exibir tela de pagamento obrigatorio (Stripe checkout) ao inves de bloquear

## Resultado
- Zero senha temporaria, zero email automatico
- Master copia e envia o link pelo canal que preferir
- Dono da agencia tem experiencia fluida: registra, loga, paga, usa
