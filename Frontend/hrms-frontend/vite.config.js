import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = env.API_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: '/login',
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/attendance': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/auth': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/profile': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/dashboard': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/leaves': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/regularization': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/payroll': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  };
});
