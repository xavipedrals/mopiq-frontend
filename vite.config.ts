import type { IncomingMessage } from 'node:http';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type ProxyOptions } from 'vite';
import vue from '@vitejs/plugin-vue';

function supabaseFunctionsProxy(): ProxyOptions {
  return {
    target: 'https://gytvwrpkwjegeatpvyqu.supabase.co',
    changeOrigin: true,
    timeout: 0,
    proxyTimeout: 0,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq, req: IncomingMessage) => {
        const authorization = req.headers.authorization;
        if (authorization) proxyReq.setHeader('Authorization', authorization);
        const apiKey = req.headers.apikey;
        if (apiKey) proxyReq.setHeader('apikey', apiKey);
      });
    },
  };
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8080,
    proxy: {
      '/functions/v1': supabaseFunctionsProxy(),
    },
  },
  preview: {
    port: 8080,
    proxy: {
      '/functions/v1': supabaseFunctionsProxy(),
    },
  },
});
