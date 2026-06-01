import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    proxy: {
      '/api':     { target: 'http://localhost:8080', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },

  build: {
    // Raise the inline-asset threshold so small images are embedded (faster first load)
    assetsInlineLimit: 8192,
    // Split vendor chunk so app code changes don't bust the large React bundle cache
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requires manualChunks as a function
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('xlsx')) return 'ui';
        },
      },
    },
    // Generate source maps only in CI/staging; omit in final production deploy
    sourcemap: false,
    // Target modern browsers — matches the school's likely device base
    target: 'es2018',
  },

  // Ensure env variables with VITE_ prefix are exposed to the client
  envPrefix: 'VITE_',
})
