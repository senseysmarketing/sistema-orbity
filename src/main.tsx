import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Versão do app - incrementar em cada deploy para forçar limpeza de cache
const APP_VERSION = '2.0.0';
const VERSION_KEY = 'orbity_app_version';

// Verificar se houve atualização de versão e limpar caches
const checkVersionAndCleanup = async () => {
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const isNewVersion = storedVersion !== APP_VERSION;
    
    if (isNewVersion) {
      console.log('[App] Nova versão detectada:', APP_VERSION, '(anterior:', storedVersion, ')');
      
      // Limpar TODOS os caches do navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        if (cacheNames.length > 0) {
          console.log('[App] Limpando todos os caches:', cacheNames);
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      }
      
      // Forçar update de todos os Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('[App] Atualizando SW:', registration.scope);
          await registration.update();
        }
      }
      
      // Salvar nova versão
      localStorage.setItem(VERSION_KEY, APP_VERSION);
      console.log('[App] Versão atualizada para:', APP_VERSION);
    }
  } catch (error) {
    console.log('[App] Erro durante verificação de versão:', error);
  }
};

// Executar verificação antes de renderizar
checkVersionAndCleanup().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
