
# Plano: Implementação Completa de PWA para iOS, Android e Desktop

## Situação Atual

O Orbity **não tem configuração PWA** completa. Atualmente existe apenas:
- ✅ Service Worker do Firebase (push notifications)
- ❌ Sem vite-plugin-pwa
- ❌ Sem manifest.json
- ❌ Sem meta tags para iOS
- ❌ Sem ícones PWA
- ❌ Sem prompt de instalação

---

## O Que Será Implementado

### Funcionalidades PWA Completas

| Recurso | iOS | Android | Desktop |
|---------|-----|---------|---------|
| Instalação na tela inicial | ✅ | ✅ | ✅ |
| Modo standalone (sem barra URL) | ✅ | ✅ | ✅ |
| Ícone personalizado | ✅ | ✅ | ✅ |
| Splash screen | ✅ | ✅ | ✅ |
| Push notifications | ✅* | ✅ | ✅ |
| Cache offline | ✅ | ✅ | ✅ |

*Push no iOS funciona a partir do iOS 16.4 com PWA instalado

---

## Implementação Técnica

### 1. Instalar `vite-plugin-pwa`

Adicionar dependência para geração automática do Service Worker e manifest:

```bash
npm install vite-plugin-pwa -D
```

### 2. Configurar `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "notification.mp3"],
      manifest: {
        name: "Orbity - Gestão Para Agências",
        short_name: "Orbity",
        description: "Sistema completo de gestão para agências de marketing",
        theme_color: "#7C3AED",
        background_color: "#0F0F23",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

### 3. Atualizar `index.html` com Meta Tags PWA

Adicionar meta tags para suporte completo a iOS, Android e Desktop:

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#7C3AED" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="application-name" content="Orbity" />
    
    <!-- iOS Specific -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Orbity" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
    
    <!-- Splash Screens iOS -->
    <link rel="apple-touch-startup-image" href="/icons/splash-640x1136.png" 
          media="(device-width: 320px) and (device-height: 568px)" />
    <link rel="apple-touch-startup-image" href="/icons/splash-750x1334.png" 
          media="(device-width: 375px) and (device-height: 667px)" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1242x2208.png" 
          media="(device-width: 414px) and (device-height: 736px)" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1125x2436.png" 
          media="(device-width: 375px) and (device-height: 812px)" />
    <link rel="apple-touch-startup-image" href="/icons/splash-1284x2778.png" 
          media="(device-width: 428px) and (device-height: 926px)" />
    
    <!-- Manifest -->
    <link rel="manifest" href="/manifest.webmanifest" />
    
    <!-- Existing meta tags... -->
  </head>
</html>
```

### 4. Criar Ícones PWA

Estrutura de ícones necessária em `public/icons/`:

```
public/icons/
├── icon-192x192.png       # Android/PWA padrão
├── icon-512x512.png       # Android/PWA grande
├── apple-touch-icon.png   # iOS (180x180)
├── favicon-32x32.png      # Favicon
├── favicon-16x16.png      # Favicon pequeno
├── splash-640x1136.png    # iPhone SE
├── splash-750x1334.png    # iPhone 8
├── splash-1125x2436.png   # iPhone X/11
├── splash-1242x2208.png   # iPhone Plus
└── splash-1284x2778.png   # iPhone Pro Max
```

Os ícones serão gerados a partir do logo existente do Orbity.

### 5. Criar Hook `usePWAInstall`

Hook para gerenciar o prompt de instalação:

```typescript
// src/hooks/usePWAInstall.tsx
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Verificar se já está instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    // Capturar evento de instalação (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    
    return outcome === 'accepted';
  };

  return {
    canInstall,
    isInstalled,
    isIOS,
    install,
  };
}
```

### 6. Componente de Prompt de Instalação

Banner/Dialog para incentivar instalação:

```typescript
// src/components/pwa/InstallPrompt.tsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Download, X, Share, Plus } from "lucide-react";
import { useState } from "react";

export function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  // iOS precisa de instruções manuais
  if (isIOS) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold">Instale o Orbity</p>
            <p className="text-sm text-white/80 mt-1">
              Toque em <Share className="inline h-4 w-4" /> e depois em 
              <span className="font-medium"> "Adicionar à Tela de Início"</span>
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  // Android/Desktop
  if (!canInstall) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl">
      <div className="flex items-center gap-3">
        <Download className="h-8 w-8" />
        <div className="flex-1">
          <p className="font-semibold">Instale o Orbity</p>
          <p className="text-sm text-white/80">Acesso rápido direto da sua tela inicial</p>
        </div>
        <Button onClick={install} variant="secondary" size="sm">
          Instalar
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
```

### 7. Página de Instalação Dedicada

Página `/install` para usuários que acessarem via QR Code ou link:

```typescript
// src/pages/Install.tsx
export default function InstallPage() {
  // UI com instruções detalhadas para cada plataforma
  // Detecta dispositivo e mostra instruções específicas
}
```

### 8. Integrar Service Worker FCM com PWA

Mesclar o service worker do Firebase com o do PWA:

```typescript
// Em vite.config.ts, adicionar:
VitePWA({
  // ...outras configs
  injectManifest: {
    injectionPoint: undefined,
  },
  strategies: 'injectManifest',
  srcDir: 'public',
  filename: 'sw.js', // Novo SW unificado
})
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Adicionar `vite-plugin-pwa` |
| `vite.config.ts` | Modificar | Configurar VitePWA |
| `index.html` | Modificar | Adicionar meta tags PWA |
| `public/icons/*` | Criar | Ícones PWA (10 arquivos) |
| `src/hooks/usePWAInstall.tsx` | Criar | Hook de instalação |
| `src/components/pwa/InstallPrompt.tsx` | Criar | Banner de instalação |
| `src/pages/Install.tsx` | Criar | Página de instalação |
| `src/App.tsx` | Modificar | Adicionar InstallPrompt |
| `public/sw.js` | Criar | Service Worker unificado |

---

## Experiência do Usuário Final

### No iPhone (iOS 16.4+)
1. Usuário acessa o Orbity pelo Safari
2. Aparece banner explicando como instalar
3. Toca em "Compartilhar" → "Adicionar à Tela de Início"
4. App instalado com ícone personalizado
5. Abre em modo standalone (sem barra do Safari)
6. Recebe push notifications

### No Android
1. Usuário acessa o Orbity pelo Chrome
2. Aparece banner "Instalar Orbity"
3. Clica em "Instalar" → confirma
4. App instalado automaticamente
5. Abre em modo standalone
6. Recebe push notifications

### No Desktop (Chrome/Edge)
1. Usuário acessa o Orbity
2. Ícone de instalação aparece na barra de endereço
3. Clica para instalar
4. App abre como janela separada
5. Atalho na área de trabalho/dock

---

## Requisitos de Ícones

Vou precisar do logo do Orbity em alta resolução (preferencialmente SVG ou PNG 1024x1024) para gerar todos os ícones necessários. Posso usar o logo existente em `src/assets/orbity-logo.png` como base.

---

## Benefícios

- **iOS**: Primeira vez que o app ficará instalável no iPhone
- **Android**: Instalação nativa com um clique
- **Desktop**: Acesso rápido sem abrir navegador
- **Offline**: Cache inteligente para uso sem internet
- **Push**: Notificações funcionam mesmo com app fechado
- **Performance**: Carregamento instantâneo via cache
