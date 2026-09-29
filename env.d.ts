/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PADDLE_ENV?: string;
  readonly VITE_PADDLE_CLIENT_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};

declare module 'vue-router' {
  interface RouteMeta {
    guestOnly?: boolean;
    requiresAuth?: boolean;
    appShell?: boolean;
  }
}
