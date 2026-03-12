// Polyfill for import.meta.env
// This is needed for libraries like Zustand that use import.meta.env.MODE
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: { NODE_ENV: 'production' } };
}
