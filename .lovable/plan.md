
# Diagnóstico e Correção: Refresh Automático ao Mudar de Aba

## Problema Identificado

Quando você sai da aplicação (muda de aba ou minimiza o navegador), a página recarrega e volta ao início, perdendo o estado de formulários em preenchimento.

---

## Análise Técnica - Causas Raiz

### 1. PWA com `autoUpdate` Sem Controle (Causa Principal)

A configuração atual do PWA em `vite.config.ts`:

```typescript
VitePWA({
  registerType: "autoUpdate",  // ← Problema aqui
  // ...
})
```

O modo `autoUpdate` faz o Service Worker atualizar automaticamente quando detecta uma nova versão. **O comportamento padrão é recarregar a página imediatamente**, especialmente quando a aba volta ao foco.

**Agravante**: Não há nenhum código usando `virtual:pwa-register` para controlar quando a atualização acontece. Isso significa que a atualização é feita de forma "silenciosa" e pode causar reload inesperado.

### 2. Service Worker com `skipWaiting()` Agressivo

No arquivo `public/firebase-messaging-sw.js`:

```javascript
self.addEventListener('install', (event) => {
  self.skipWaiting();  // ← Força ativação imediata
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());  // ← Assume controle de todas as abas
});
```

Quando um novo Service Worker é instalado, ele imediatamente toma controle e pode forçar um reload da página.

### 3. TanStack Query com `refetchOnWindowFocus` Padrão

O `QueryClient` é criado sem configurações:

```typescript
const queryClient = new QueryClient();  // ← Usa defaults
```

Por padrão, TanStack Query tem `refetchOnWindowFocus: true`, o que causa refetch de dados ao voltar para a aba. Isso não causa reload da página, mas pode contribuir para a sensação de "reset" se os dados mudarem.

---

## Solução Proposta

### 1. Desabilitar Auto-Reload do PWA

Mudar de `autoUpdate` para `prompt` e controlar manualmente quando atualizar:

```typescript
// vite.config.ts
VitePWA({
  registerType: "prompt",  // ← Permite controle manual
  // ...
})
```

### 2. Criar Componente de Atualização Controlada

Criar um componente que mostra um toast/banner quando há atualização disponível, permitindo que o usuário escolha quando atualizar:

```typescript
// src/components/pwa/UpdatePrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 ...">
      <p>Nova versão disponível!</p>
      <Button onClick={() => updateServiceWorker(true)}>
        Atualizar
      </Button>
      <Button onClick={() => setNeedRefresh(false)}>
        Depois
      </Button>
    </div>
  );
}
```

### 3. Configurar TanStack Query para Não Refetch ao Focar

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,  // ← Desabilita refetch automático
      staleTime: 5 * 60 * 1000,     // Dados ficam "frescos" por 5 minutos
    },
  },
});
```

### 4. Remover `skipWaiting()` do Firebase SW

Modificar o Service Worker para não forçar atualização imediata:

```javascript
// public/firebase-messaging-sw.js
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  // Remover: self.skipWaiting();
});
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `vite.config.ts` | Mudar `registerType` para `"prompt"` |
| `src/App.tsx` | Configurar QueryClient com `refetchOnWindowFocus: false` |
| `src/components/pwa/UpdatePrompt.tsx` | Criar componente de atualização controlada |
| `public/firebase-messaging-sw.js` | Remover `skipWaiting()` e `clients.claim()` agressivos |

---

## Comportamento Após Correção

| Cenário | Antes | Depois |
|---------|-------|--------|
| Voltar para aba após minimizar | Página recarrega, perde formulário | Mantém estado, sem reload |
| Nova versão do app disponível | Recarrega automaticamente | Mostra toast "Atualizar agora?" |
| Dados em cache obsoletos | Refetch agressivo ao focar | Dados mantidos por 5 min, refetch manual |

---

## Fluxo de Atualização Controlada

```text
┌──────────────────────────────────────────────────────────────────┐
│ Usuário está preenchendo formulário                              │
├──────────────────────────────────────────────────────────────────┤
│ Nova versão do app é detectada pelo Service Worker               │
├──────────────────────────────────────────────────────────────────┤
│ Toast aparece: "Nova versão disponível!"                         │
│   [Atualizar Agora]  [Depois]                                    │
├──────────────────────────────────────────────────────────────────┤
│ Usuário clica "Depois" → Continua preenchendo                    │
│ Usuário termina formulário → Clica "Atualizar Agora"             │
│ Página recarrega com nova versão                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Preserva Estado** - Formulários e dados em preenchimento não são perdidos
2. **Controle do Usuário** - Usuário decide quando aceitar atualizações
3. **Melhor UX** - Menos interrupções inesperadas durante o uso
4. **Menos Requisições** - Reduz carga no servidor ao não refetch automático
5. **Transparência** - Usuário sabe quando há atualização disponível
