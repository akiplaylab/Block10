# 開発ガイド

## ローカル開発

Node.js 22 LTS（22.12 以上）と npm を使用します。

```sh
npm ci
npm run dev
```

ターミナルに表示された URL を開きます。同じネットワーク上の端末で試す場合は、`npm run dev -- --host 0.0.0.0` を実行して Network URL を開きます。

| 環境 | ビルド | プレビュー | パス |
| --- | --- | --- | --- |
| 本番 | `npm run build` | `npm run preview` | `/block10/` |
| テスト | `npm run build:test` | `npm run preview -- --mode pages-test` | `/block10/test/` |

どちらのビルドも TypeScript の型チェックを行い、`dist/` に出力します。

## テスト

依存関係を `npm ci` でインストールしてから `npm test` を実行します。Node.js のテストランナーで、ランダム出題の候補設定と数字入力の判定を検証します。

## 公開と受け入れテスト

GitHub Actions は `main` を本番 URL に公開し、同じリポジトリから `main` へのオープン PR をそれぞれ `/block10/test/pr-<PR 番号>/` に公開します。`main` への push と、PR の作成・更新・再オープン・クローズで公開内容とテスト環境一覧が更新されます。

1. PR の作成や更新後に、Actions の「Deploy to GitHub Pages」で公開結果を確認します。
2. [テスト環境一覧](https://akiplaylab.github.io/block10/test/)から対象の PR を開き、`TEST · PR #番号 · 短縮SHA` が確認対象のコミットと一致していることを確かめてからプレイします。
3. 受け入れ後は GitHub で PR を手動マージし、[本番 URL](https://akiplaylab.github.io/block10/) を確認します。
