import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: process.env.BASE_PATH || '/',
  server: {
    host: true,
    proxy: {
      '/proxy/ark': {
        target: 'https://ark.cn-beijing.volces.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/ark/, '')
      }
    }
  }
});
