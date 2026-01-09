import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: 'src/frontend',
  envDir: path.resolve(__dirname, '.'),
  // Use repo name as base path for GitHub Pages, '/' for local dev
  base: mode === 'pages' ? '/greenthumb-V0.1/' : '/',
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/frontend/index.html'),
        // Include 404.html for GitHub Pages SPA routing
        ...(mode === 'pages' && {
          '404': path.resolve(__dirname, 'src/frontend/404.html'),
        }),
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
}));
