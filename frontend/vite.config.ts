import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://mediumspringgreen-wallaby-731721.hostingersite.com',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'https://mediumspringgreen-wallaby-731721.hostingersite.com',
        changeOrigin: true,
      },
    },
  },
});

