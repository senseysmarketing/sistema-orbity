import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
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
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit
        // REMOVIDO: runtimeCaching para Supabase - causava problemas de sincronização
        // O cache de API estava interferindo com mudanças de aba
        runtimeCaching: [],
        // Não fazer fallback de navegação para evitar comportamento inesperado
        navigateFallback: null,
        // Controle manual de atualizações
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
