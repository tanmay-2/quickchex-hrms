import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    open: '/login',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});

// HTTPS is currently disabled
// https: {
//   key: fs.readFileSync(path.resolve(__dirname, './key.pem')),
//   cert: fs.readFileSync(path.resolve(__dirname, './cert.pem')),
// },


// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
