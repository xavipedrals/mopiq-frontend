/// <reference types="vite/client" />

export {};

declare module 'vue-router' {
  interface RouteMeta {
    guestOnly?: boolean;
    requiresAuth?: boolean;
    appShell?: boolean;
  }
}
