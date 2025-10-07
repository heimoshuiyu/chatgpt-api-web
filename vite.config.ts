import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ['favicon.png'],
      manifest: {
        name: "ChatGPT-API-WEB",
        short_name: "CAW",
        description: "ChatGPT API Web Interface",
        theme_color: "#000000",
        icons: [
          {
            src: "favicon.png",
            sizes: "256x256",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            'sonner'
          ],
          editor: ['@monaco-editor/react'],
          markdown: [
            'react-markdown',
            'rehype-highlight',
            'rehype-katex',
            'remark-gfm',
            'remark-math'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
});
