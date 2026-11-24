import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages-test' ? '/Block10/test/' : mode === 'production' ? '/Block10/' : '/',
  build: { target: 'safari15' },
  plugins: mode === 'pages-test' ? [{
    name: 'pages-test-banner',
    transformIndexHtml() {
      const pr = process.env.VITE_TEST_PR ?? '';
      const sha = process.env.VITE_TEST_SHA ?? '';
      const revision = /^\d+$/.test(pr) && /^[0-9a-f]{7,40}$/.test(sha)
        ? `PR #${pr} · ${sha.slice(0, 7)}`
        : 'ローカルビルド';

      return [
        { tag: 'meta', attrs: { name: 'robots', content: 'noindex' }, injectTo: 'head' },
        {
          tag: 'aside',
          attrs: { class: 'test-banner' },
          children: `TEST · ${revision}`,
          injectTo: 'body-prepend',
        },
      ];
    },
  }] : [],
}));
