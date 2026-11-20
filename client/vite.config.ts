import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on :4000 and Vite proxies /api to it,
// so the client always talks to a same-origin /api path.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: { outDir: 'dist', sourcemap: false },
});
