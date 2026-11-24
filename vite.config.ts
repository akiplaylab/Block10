import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Block10/' : '/',
  build: { target: 'safari15' },
}));
