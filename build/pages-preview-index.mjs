import { mkdir, readdir, writeFile } from 'node:fs/promises';

const escapedCharacters = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const directory = 'dist/test';
await mkdir(directory, { recursive: true });
const artifacts = new Set(await readdir(directory));
const links = JSON.parse(process.env.PREVIEWS)
  .filter(({ number }) => artifacts.has(`pr-${number}`))
  .map(({ number, title }) => {
    const escapedTitle = title.replace(/[&<>]/g, character => escapedCharacters[character]);
    return `<li><a href="./pr-${number}/">PR #${number} · ${escapedTitle}</a></li>`;
  });

await writeFile(`${directory}/index.html`, `<!doctype html>
<html lang="ja">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>テスト環境一覧 · ブロック 10</title>
<main>
  <h1>テスト環境一覧</h1>
  ${links.length ? `<ul>\n    ${links.join('\n    ')}\n  </ul>` : '<p>公開中のテスト環境はありません。</p>'}
</main>
</html>
`);
