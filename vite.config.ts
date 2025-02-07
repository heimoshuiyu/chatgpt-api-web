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
});
