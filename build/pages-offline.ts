import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

function digest(content: string | Buffer) {
  return createHash('sha256').update(content).digest('hex');
}

export function pagesOffline(test: boolean): Plugin {
  let config: ResolvedConfig;
  const manifest = 'manifest.webmanifest';
  const worker = 'service-worker.js';

  return {
    name: 'block10-pages-offline',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        return [{
          tag: 'link',
          attrs: { rel: 'manifest', href: config.base + manifest },
          injectTo: 'head',
        }];
      },
    },
    async writeBundle(options) {
      const directory = resolve(config.root, options.dir ?? config.build.outDir);
      await writeFile(resolve(directory, manifest), JSON.stringify({
        id: config.base,
        start_url: config.base,
        scope: config.base,
        name: 'ブロック 10',
        short_name: 'ブロック 10',
        lang: 'ja',
        display: 'standalone',
        theme_color: '#83d7ff',
        background_color: '#83d7ff',
        icons: [192, 512].map(size => ({
          src: `pwa-${size}.png`,
          sizes: `${size}x${size}`,
          type: 'image/png',
        })),
      }, null, 2));

      const paths = (await readdir(directory, { recursive: true, withFileTypes: true }))
        .filter(entry => entry.isFile())
        .map(entry => resolve(entry.parentPath, entry.name).slice(directory.length + 1).replaceAll('\\', '/'))
        .filter(path => path !== worker)
        .sort();
      const assets = await Promise.all(paths.map(async path => [
        path,
        digest(await readFile(resolve(directory, path))),
      ]));
      const template = await readFile(resolve(config.root, 'build/service-worker.js'), 'utf8');
      const settings = JSON.stringify({ base: config.base, test, assets });
      const revision = digest(settings + template);
      await writeFile(resolve(directory, worker), `const build = ${settings};\nconst revision = "${revision}";\n${template}`);
    },
  };
}
