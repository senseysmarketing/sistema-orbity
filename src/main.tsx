import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Limpar Service Workers antigos que podem causar refresh automático
const cleanupOldServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // Forçar atualização do SW para garantir versão mais recente
        const scriptURL = registration.active?.scriptURL || '';
        
        // Se é o firebase-messaging-sw.js, forçar update
        if (scriptURL.includes('firebase-messaging-sw.js')) {
          console.log('[App] Atualizando Firebase SW...');
          await registration.update();
        }
      }
      
      // Limpar caches antigos que podem ter comportamento de refresh agressivo
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        // Limpar apenas caches do workbox antigos (não os atuais)
        const oldCaches = cacheNames.filter(name => 
          name.includes('workbox-precache-v1') || 
          name.includes('workbox-runtime')
        );
        if (oldCaches.length > 0) {
          console.log('[App] Limpando caches antigos:', oldCaches);
          await Promise.all(oldCaches.map(name => caches.delete(name)));
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
