
# Correção Definitiva: Refresh Persistente ao Trocar de Aba

## Problema Identificado

O problema de refresh automático continua mesmo após as correções no código. Isso indica que:

1. **Cache do Service Worker antigo** - O Service Worker anterior (com `skipWaiting()` e `clients.claim()`) ainda está instalado e ativo no navegador dos usuários
2. **Realtime Channels** - Múltiplos canais Supabase Realtime podem estar reconectando ao voltar para a aba
3. **Hook de visibilidade ainda ativo** - O `useSubscription` ainda tem um `useEffect` que depende de `isVisible` (linhas 282-291)

---

## Causas Raiz

### 1. Service Worker Antigo em Cache (CAUSA PRINCIPAL PROVÁVEL)

O navegador ainda tem a versão antiga do Service Worker em cache. Mesmo que o código novo não tenha `skipWaiting()`, o SW antigo ainda está:
- Interceptando requisições
- Forçando reload quando detecta mudanças
- Tomando controle das abas com `clients.claim()`

**Solução**: Adicionar código para desregistrar Service Workers antigos e forçar atualização limpa.

### 2. useSubscription ainda depende de isVisible

Na linha 282-291 de `useSubscription.tsx`:

```typescript
useEffect(() => {
  if (isVisible && user) {
    const timeAway = getTimeAway();
    const AWAY_THRESHOLD = 10 * 60 * 1000;
    
    if (timeAway > AWAY_THRESHOLD) {
      setShowRefreshAlert(true);  // Isso pode causar re-render
    }
  }
}, [isVisible, user, getTimeAway]);  // ← isVisible ainda está aqui
```

Este `useEffect` é executado toda vez que `isVisible` muda, o que pode causar re-renders.

### 3. Múltiplos Realtime Channels

Existem vários canais Supabase Realtime que podem estar se reconectando ao voltar para a aba:
- `reminder_lists_changes`
- `crm-leads-{agencyId}`
- `notifications-changes`
- `task-assignments-changes`
- `post-assignments-changes`
- `reminders_changes`

---

## Plano de Correção

### Fase 1: Limpar Service Worker Antigo

Adicionar código em `main.tsx` para:
1. Desregistrar Service Workers antigos
2. Limpar caches do navegador
3. Permitir instalação limpa do novo SW

```typescript
// src/main.tsx
// Limpar Service Workers antigos antes de iniciar a aplicação
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      // Verificar se é um SW antigo (não o do PWA atual)
      if (registration.active?.scriptURL.includes('firebase-messaging-sw.js')) {
        console.log('[App] Desregistrando SW antigo:', registration.scope);
        registration.unregister();
      }
    }
  });
}
```

### Fase 2: Otimizar Hook de Visibilidade

Modificar `useSubscription.tsx` para evitar re-renders desnecessários:

```typescript
// ANTES
useEffect(() => {
  if (isVisible && user) {
    // ... lógica
  }
}, [isVisible, user, getTimeAway]);

// DEPOIS - usar ref para evitar re-render
const wasVisibleRef = useRef(true);

useEffect(() => {
  // Só executa quando VOLTA para visível (não quando sai)
  if (isVisible && !wasVisibleRef.current && user) {
    const timeAway = getTimeAway();
    if (timeAway > AWAY_THRESHOLD) {
      setShowRefreshAlert(true);
    }
  }
  wasVisibleRef.current = isVisible;
}, [isVisible]);
```

### Fase 3: Atualizar UpdatePrompt para Limpar Cache

Modificar `UpdatePrompt.tsx` para limpar caches antes de atualizar:

```typescript
const handleUpdate = async () => {
  // Limpar caches antes de atualizar
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
  updateServiceWorker(true);
};
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/main.tsx` | Adicionar limpeza de Service Workers antigos |
| `src/hooks/useSubscription.tsx` | Usar ref para evitar re-renders em mudança de visibilidade |
| `src/components/pwa/UpdatePrompt.tsx` | Limpar caches antes de atualizar |

---

## Instruções para Usuário Limpar Cache Manualmente

Enquanto as correções são aplicadas, o usuário pode limpar manualmente:

### Chrome/Edge:
1. F12 (DevTools)
2. Aba "Application"
3. Seção "Service Workers" → "Unregister"
4. Seção "Cache" → "Clear storage"

### Firefox:
1. F12 (DevTools)
2. Aba "Storage"
3. "Cache Storage" → Deletar todos
4. "Service Workers" → Unregister

### Safari:
1. Develop menu → "Empty Caches"
2. Settings → Privacy → "Manage Website Data" → Remove

---

## Implementação Técnica

### 1. src/main.tsx

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Limpar Service Workers antigos que podem causar refresh automático
const cleanupOldServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // Se o SW atual não é o novo PWA SW, desregistrar
        const isOldFirebaseSW = registration.active?.scriptURL.includes('firebase-messaging-sw.js');
        if (isOldFirebaseSW) {
          console.log('[App] Encontrado SW antigo, verificando versão...');
          // Forçar atualização do SW
          await registration.update();
        }
      }
    } catch (error) {
      console.log('[App] Erro ao limpar SWs:', error);
    }
  }
};

// Executar limpeza antes de renderizar
cleanupOldServiceWorkers();

createRoot(document.getElementById("root")!).render(<App />);
```

### 2. src/hooks/useSubscription.tsx (refatoração)

```typescript
// Adicionar import de useRef
import { ..., useRef } from 'react';

// Dentro do Provider:
const wasVisibleRef = useRef(true);
const lastVisibilityCheckRef = useRef(Date.now());

// Substituir o useEffect de visibilidade (linhas 282-291)
useEffect(() => {
  const now = Date.now();
  
  // Só processa se passou para visível E estava invisível antes
  if (isVisible && !wasVisibleRef.current) {
    const timeAway = now - lastVisibilityCheckRef.current;
    
    // Só mostra alerta se ficou muito tempo fora (10 min)
    if (user && timeAway > 10 * 60 * 1000) {
      setShowRefreshAlert(true);
    }
  }
  
  // Atualizar refs sem causar re-render
  wasVisibleRef.current = isVisible;
  if (!isVisible) {
    lastVisibilityCheckRef.current = now;
  }
}, [isVisible]); // Removido user e getTimeAway das deps
```

### 3. src/components/pwa/UpdatePrompt.tsx

```typescript
const handleUpdate = async () => {
  try {
    // Limpar todos os caches antes de atualizar
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('[PWA] Limpando caches:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  } catch (error) {
    console.error('[PWA] Erro ao limpar caches:', error);
  }
  
  // Agora atualizar o Service Worker
  updateServiceWorker(true);
};
```

---

## Fluxo Após Correções

```text
┌────────────────────────────────────────────────────────────────┐
│ App inicia                                                      │
├────────────────────────────────────────────────────────────────┤
│ main.tsx: Verifica e atualiza SWs antigos                       │
│ UpdatePrompt: Registra novo SW com registerType="prompt"        │
├────────────────────────────────────────────────────────────────┤
│ Usuário navega e preenche formulário                            │
├────────────────────────────────────────────────────────────────┤
│ Usuário muda de aba                                             │
│   ├── isVisible = false                                         │
│   ├── wasVisibleRef.current = false                             │
│   └── lastVisibilityCheckRef.current = agora                    │
├────────────────────────────────────────────────────────────────┤
│ Usuário volta à aba (poucos segundos depois)                    │
│   ├── isVisible = true                                          │
│   ├── wasVisibleRef era false → verifica tempo                  │
│   ├── tempo < 10min → NÃO mostra alerta                         │
│   └── Estado preservado, sem re-render                          │
├────────────────────────────────────────────────────────────────┤
│ Usuário volta à aba (após 15 minutos)                           │
│   ├── tempo > 10min → mostra alerta discreto                    │
│   └── "Dados podem estar desatualizados. [Atualizar]"           │
└────────────────────────────────────────────────────────────────┘
```

---

## Benefícios Esperados

1. **Elimina refresh automático** - Service Workers antigos são atualizados
2. **Cache limpo** - Sem conflitos entre versões antigas e novas
3. **Re-renders minimizados** - Uso de refs evita re-execução de effects
4. **UX melhorada** - Formulários e estado preservados ao trocar de aba
5. **Atualização controlada** - Usuário decide quando aceitar novas versões
