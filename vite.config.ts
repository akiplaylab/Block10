import { defineConfig } from 'vite';
import { pagesOffline } from './build/pages-offline';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'block10';
const pagesBase = `/${repositoryName.toLowerCase()}/`;

export default defineConfig(({ mode }) => ({
  base: mode === 'pages-test' ? `${pagesBase}test/` : mode === 'production' ? pagesBase : '/',
  build: { target: 'safari15' },
  plugins: [pagesOffline(mode === 'pages-test'), ...(mode === 'pages-test' ? [{
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
          children: `TEST · ${revision}<span id="offline-test" hidden> · オフライン保存版</span>`,
          injectTo: 'body-prepend',
        },
      ];
    },
  } as const] : [])],
}));
