
# Plano: Melhorias de UX para PWA e Banners de Notificação

## Problemas Identificados

1. **Banners aparecendo na Landing Page** - Os componentes `InstallPrompt` e `PushActivationBanner` estão no nível global do `App.tsx`, aparecendo em todas as páginas, inclusive na Landing Page
2. **PWA redirecionando para Landing Page** - Quando o usuário abre o app instalado (modo standalone), ele vê a Landing Page ao invés de ir direto para login/dashboard

---

## Solução Proposta

### Parte 1: Mover Banners para Dentro do AppLayout

Atualmente os banners estão em `App.tsx` (global):
```typescript
<InstallPrompt />
<UpdatePrompt />
<PushActivationBanner />
```

Mover `InstallPrompt` e `PushActivationBanner` para dentro do `AppLayout.tsx`, que só é renderizado quando o usuário está autenticado e dentro do dashboard.

O `UpdatePrompt` pode permanecer global pois é importante para atualizações do PWA em qualquer tela.

### Parte 2: Redirecionamento Inteligente na Landing Page

Adicionar lógica na `LandingPage.tsx` para:
1. Detectar se está em modo standalone (PWA instalado)
2. Verificar se usuário está logado
3. Redirecionar automaticamente:
   - Se logado → `/dashboard`
   - Se não logado + em PWA → `/auth`

```typescript
// Detectar modo standalone
const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
  || (window.navigator as any).standalone === true;

// Se está no PWA, redirecionar
useEffect(() => {
  if (isStandalone) {
    if (user) {
      navigate('/dashboard');
    } else if (!loading) {
      navigate('/auth');
    }
  }
}, [isStandalone, user, loading]);
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/App.tsx` | Remover `InstallPrompt` e `PushActivationBanner` do nível global |
| `src/components/layout/AppLayout.tsx` | Adicionar `InstallPrompt` e `PushActivationBanner` dentro do layout autenticado |
| `src/pages/LandingPage.tsx` | Adicionar detecção de PWA e redirecionamento inteligente |

---

## Fluxo Esperado

```text
Acesso pelo NAVEGADOR (browser):
┌────────────────────────────────────────────────────────────────┐
│ Usuário acessa / (Landing Page)                                 │
│   └── Vê a Landing Page normalmente                            │
│   └── Sem banners de instalação/notificação                    │
│   └── Pode clicar em "Entrar" → /auth                          │
├────────────────────────────────────────────────────────────────┤
│ Usuário faz login → /dashboard                                  │
│   └── Agora vê os banners (Install/Push) se aplicável          │
└────────────────────────────────────────────────────────────────┘

Acesso pelo PWA (standalone):
┌────────────────────────────────────────────────────────────────┐
│ Usuário abre o app instalado                                    │
│   └── Landing Page detecta modo standalone                     │
│   └── Verifica se está logado                                  │
│       ├── Se SIM → Redireciona para /dashboard                 │
│       └── Se NÃO → Redireciona para /auth                      │
└────────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **UX limpa na Landing Page** - Visitantes não veem banners desnecessários
2. **Acesso direto no PWA** - Usuários do app não passam pela Landing Page
3. **Lógica inteligente** - Sistema detecta contexto e adapta comportamento
4. **Mantém funcionalidade** - Banners continuam funcionando para usuários logados
