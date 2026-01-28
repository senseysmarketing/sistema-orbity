
# Diagnóstico Profundo: Refresh Persistente ao Trocar de Aba

## Análise do Problema

Após análise detalhada de todo o código, identifiquei que as correções anteriores foram aplicadas corretamente, mas o problema persiste. Isso indica que a causa raiz é mais profunda e envolve **cache persistente do navegador** que ainda contém código antigo.

---

## Causas Raiz Identificadas

### 1. Service Worker do Workbox (PWA) em Cache Permanente

O arquivo `vite.config.ts` configura o Workbox para cachear arquivos:

```typescript
workbox: {
  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit
  runtimeCaching: [...]
}
```

**Problema**: O Service Worker gerado pelo Workbox (não o `firebase-messaging-sw.js`) pode ter uma versão antiga cacheada que ainda contém lógica de auto-refresh. Este SW é diferente do Firebase SW e é responsável pelo cache de assets da aplicação.

### 2. Precache do Workbox Não Está Sendo Limpo

O código em `main.tsx` limpa apenas caches específicos:
```typescript
const oldCaches = cacheNames.filter(name => 
  name.includes('workbox-precache-v1') || 
  name.includes('workbox-runtime')
);
```

Mas o Workbox pode usar outros nomes de cache como:
- `workbox-precache-v2-...`
- `workbox-sw-...`
- `sw-precache-...`

### 3. Ausência de Versionamento Forçado no SW

Quando o `registerType` é `"prompt"`, o usuário precisa clicar para atualizar. Se o SW antigo já está instalado, ele continua funcionando até ser explicitamente atualizado.

### 4. Comportamento Oculto do `NetworkFirst` no Workbox

O runtime caching está configurado como `NetworkFirst` para Supabase:
```typescript
handler: "NetworkFirst",
```

Quando a rede falha ou a aba perde foco, o Workbox pode estar retornando respostas cacheadas que disparam re-renderizações.

---

## Solução Definitiva em 4 Partes

### Parte 1: Forçar Limpeza Completa de TODOS os Caches no Startup

Modificar `main.tsx` para limpar TODOS os caches do navegador (não apenas os específicos):

```typescript
const cleanupOldServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      // 1. Forçar update de TODOS os Service Workers registrados
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('[App] Forcing SW update:', registration.scope);
        await registration.update();
      }
      
      // 2. Limpar TODOS os caches (não apenas workbox)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          console.log('[App] Clearing all caches:', cacheNames);
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      }
    } catch (error) {
      console.log('[App] Error during cleanup:', error);
    }
  }
};
```

### Parte 2: Adicionar Versão de Build no Service Worker

Criar um mecanismo que force a invalidação do SW quando há uma nova versão:

1. No `vite.config.ts`, adicionar uma versão dinâmica:
```typescript
VitePWA({
  registerType: "prompt",
  workbox: {
    // Adicionar timestamp de build para forçar invalidação
    additionalManifestEntries: [
      { url: '/version.json', revision: Date.now().toString() }
    ],
    skipWaiting: false, // Manter controle manual
    clientsClaim: false, // Não assumir controle automaticamente
  }
})
```

### Parte 3: Desabilitar Completamente o Cache do Supabase no Workbox

O `NetworkFirst` ainda cacheia respostas. Remover completamente o runtime caching para Supabase:

```typescript
workbox: {
  globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
  maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
  // REMOVER o runtimeCaching para Supabase
  runtimeCaching: [], // Vazio
  navigateFallback: null, // Não fazer fallback de navegação
}
```

### Parte 4: Criar Componente de "Reset Completo" para Usuários

Adicionar um botão em Settings que force limpeza completa:

```typescript
const handleFullReset = async () => {
  // 1. Desregistrar TODOS os Service Workers
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(r => r.unregister()));
  
  // 2. Limpar TODOS os caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  
  // 3. Limpar localStorage e sessionStorage seletivamente
  // (manter apenas auth-related)
  const authData = localStorage.getItem('sb-ovookkywclrqfmtumelw-auth-token');
  localStorage.clear();
  if (authData) localStorage.setItem('sb-ovookkywclrqfmtumelw-auth-token', authData);
  
  // 4. Recarregar a página
  window.location.reload();
};
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/main.tsx` | Limpeza agressiva de todos os caches no startup |
| `vite.config.ts` | Remover runtimeCaching do Supabase, adicionar versionamento |
| `src/components/pwa/UpdatePrompt.tsx` | Melhorar lógica de limpeza antes de atualizar |
| `src/pages/Settings.tsx` | Adicionar botão de "Reset Completo" |

---

## Implementação Detalhada

### 1. main.tsx - Limpeza Agressiva no Startup

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Versão do app - incrementar em cada deploy
const APP_VERSION = '1.0.1';
const VERSION_KEY = 'orbity_app_version';

// Verificar se houve atualização de versão
const checkVersionAndCleanup = async () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const isNewVersion = storedVersion !== APP_VERSION;
  
  if (isNewVersion) {
    console.log('[App] Nova versão detectada, limpando caches...');
    
    // Limpar TODOS os caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('[App] Limpando caches:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Forçar update de Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update();
      }
    }
    
    // Salvar nova versão
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
};

// Executar verificação antes de renderizar
checkVersionAndCleanup().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
```

### 2. vite.config.ts - Configuração Otimizada do PWA

```typescript
VitePWA({
  registerType: "prompt",
  includeAssets: ["favicon.ico", "notification.mp3"],
  manifest: {
    // ... manter manifest atual
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    // REMOVER runtime caching - causa problemas de sincronização
    runtimeCaching: [],
    // Não fazer fallback de navegação
    navigateFallback: null,
    // Não pular waiting automaticamente
    skipWaiting: false,
    clientsClaim: false,
  },
}),
```

### 3. UpdatePrompt.tsx - Limpeza Completa antes de Atualizar

```typescript
const handleUpdate = async () => {
  try {
    // Limpar TODOS os caches antes de atualizar
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('[PWA] Limpando todos os caches:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Desregistrar SWs antigos (exceto o novo)
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        // Manter apenas o SW principal do PWA
        if (!reg.scope.endsWith('/')) {
          console.log('[PWA] Removendo SW:', reg.scope);
          await reg.unregister();
        }
      }
    }
  } catch (error) {
    console.error('[PWA] Erro ao limpar:', error);
  }
  
  // Agora atualizar o Service Worker
  updateServiceWorker(true);
};
```

### 4. Settings.tsx - Botão de Reset Completo

Adicionar uma seção em configurações:

```typescript
const handleCacheReset = async () => {
  try {
    // Desregistrar todos os SWs
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    
    // Limpar todos os caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Preservar apenas autenticação
    const authKey = 'sb-ovookkywclrqfmtumelw-auth-token';
    const authData = localStorage.getItem(authKey);
    
    // Limpar localStorage exceto auth
    const keysToKeep = [authKey];
    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    
    toast.success('Cache limpo! Recarregando...');
    
    // Recarregar após delay
    setTimeout(() => window.location.reload(), 1000);
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    toast.error('Erro ao limpar cache');
  }
};
```

---

## Fluxo Esperado Após Correções

```text
┌────────────────────────────────────────────────────────────────┐
│ Usuário acessa o app                                            │
├────────────────────────────────────────────────────────────────┤
│ main.tsx: Verifica APP_VERSION                                  │
│   └── Se versão diferente → Limpa TODOS os caches              │
│   └── Atualiza versão no localStorage                          │
├────────────────────────────────────────────────────────────────┤
│ App carrega normalmente                                         │
│ Workbox NÃO cacheia chamadas Supabase (runtimeCaching vazio)   │
├────────────────────────────────────────────────────────────────┤
│ Usuário muda de aba                                             │
│   └── Nenhum SW ou cache interfere                              │
│   └── Estado React permanece intacto                           │
├────────────────────────────────────────────────────────────────┤
│ Usuário volta à aba                                             │
│   └── Página não recarrega                                      │
│   └── Formulários e dados preservados                          │
└────────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Versionamento forçado** - Cada deploy limpa caches antigos automaticamente
2. **Sem cache de API** - Supabase sempre busca dados frescos
3. **Reset manual disponível** - Usuário pode forçar limpeza se necessário
4. **Compatibilidade PWA mantida** - Push notifications continuam funcionando
5. **Sem interferência no tab switch** - Nenhum hook ou SW causa refresh

---

## Instruções para Teste

Após implementação, o usuário deve:

1. **Acessar o app normalmente** (versão será detectada e caches limpos)
2. **Navegar para qualquer tela com formulário**
3. **Mudar de aba por alguns segundos**
4. **Voltar à aba**
5. **Verificar que o formulário NÃO foi resetado**

Se ainda houver problemas após as correções, usar o botão "Limpar Cache" em Configurações.
