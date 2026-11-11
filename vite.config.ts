import type { IncomingMessage } from 'node:http';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import vue from '@vitejs/plugin-vue';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visitorCountryPlugin } from './visitorCountryPlugin.js';

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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_SENTRY_DSN', 'SENTRY_AUTH_TOKEN']);
  const sentryBuild = command === 'build' && Boolean(env.VITE_SENTRY_DSN);
  const uploadSourceMaps = sentryBuild && Boolean(env.SENTRY_AUTH_TOKEN);

  return {
    plugins: [
      vue(),
      visitorCountryPlugin(),
      sentryBuild && sentryVitePlugin({
        org: 'xavier-pedrals-camprubi',
        project: 'mopiq-web',
        authToken: env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        silent: !uploadSourceMaps,
        release: { create: uploadSourceMaps, finalize: uploadSourceMaps },
        sourcemaps: {
          disable: !uploadSourceMaps,
          filesToDeleteAfterUpload: './dist/assets/**/*.map',
        },
      }),
    ],
    build: {
      sourcemap: uploadSourceMaps ? 'hidden' : false,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 8080,
      // Sandbox checkout has to be opened from an approved https host.
      allowedHosts: mode === 'sandbox' ? true : undefined,
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
  };
});
