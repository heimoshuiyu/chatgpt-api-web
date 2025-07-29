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
    // 启用代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 React 相关库分离
          'react-vendor': ['react', 'react-dom'],
          // 将 UI 组件库分离
          'ui-vendor': ['@radix-ui/react-slot', '@radix-ui/react-toast', '@radix-ui/react-dialog'],
          // 将工具库分离
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    // 启用压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 启用源码映射（开发时）
    sourcemap: false,
    // 设置块大小警告限制
    chunkSizeWarningLimit: 1000,
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
