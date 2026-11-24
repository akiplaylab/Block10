# ブロック 10

「あそぶ」を押すと「10 をつくる」が始まります。盤面の青いブロックに足すオレンジのブロックを、3 つの選択肢から 1 つ選びます。ぴったり 10 個になると虹色のブロックを 1 個獲得します。多すぎたり少なすぎたりしても、同じ問題に何度でも挑戦できます。ヒントを押すと、盤面の空いているマスが光ります。

- [本番環境であそぶ](https://akiplaylab.github.io/block10/)
- [テスト環境であそぶ](https://akiplaylab.github.io/block10/test/)

LINE や SNS でゲームの URL を共有すると、共有プレビューには専用の横長 OGP 画像を使用します。

## 開発環境で起動

Node.js 22 LTS（22.12 以上）と npm を使用します。

```sh
npm ci
npm run dev
```

ターミナルに表示された URL をブラウザーで開きます。同じネットワーク上の iPad や iPhone で試す場合は、`npm run dev -- --host 0.0.0.0` を実行して、表示された Network URL を開きます。

## ビルド

```sh
npm run build
npm run preview
```

ビルドは TypeScript の型チェックを実行し、静的ファイルを `dist/` に出力します。ビルド結果は、プレビューサーバーが表示する `/block10/` の URL で確認できます。

テスト環境用にビルドする場合は `npm run build:test` を実行し、`npm run preview -- --mode pages-test` で `/block10/test/` を開きます。

## 公開と受け入れテスト

GitHub Actions は `main` のビルドをサイトのルートに、選択した PR のビルドを `/test/` にまとめて公開します。`main` への push と、同じリポジトリから `main` への PR の作成・コミット更新・再オープン・クローズが自動公開のきっかけです。自動公開では、対象となるオープン PR のうち、GitHub の最終更新日時が最も新しいものを選びます。外部 Fork の PR は対象外です。

1. 実装用の PR を作成し、Actions の「Deploy to GitHub Pages」で公開状況を確認します。実行の概要には選択された PR とコミットが表示されます。
2. スマートフォンでテスト環境を開き、画面端の `TEST · PR #番号 · 短縮SHA` が PR の最新コミットと一致することを確認してからプレイします。対象なし・ビルド失敗の場合は、テスト URL にその状態が表示されます。
3. 修正を push したら、公開の完了と短縮 SHA の更新を確認して再度プレイします。受け入れ後に GitHub で PR を手動マージし、本番環境を確認します。

テスト対象を指定するには、GitHub の **Actions → Deploy to GitHub Pages → Run workflow** を開き、ブランチに `main`、入力欄に PR 番号を指定します。空欄の場合は自動選択されます。固定 URL は共有されるため、次の自動公開では最新の対象 PR に切り替わります。

## iPad・iPhone のホーム画面に追加

1. Safari で[ゲームの公開ページ](https://akiplaylab.github.io/block10/)を開きます。
2. 共有メニューから「ホーム画面に追加」を選びます。
3. 名前が「ブロック 10」であることを確認し、「追加」をタップします。

## Windows のデスクトップに追加

Microsoft Edge でゲームを開き、メニューの「アプリ」から「このサイトをアプリとしてインストール」を選びます。インストール後、`edge://apps` で「ブロック 10」の詳細を開き、「デスクトップ ショートカットの作成」を選びます。[Microsoft Edge のアプリの手順](https://support.microsoft.com/en-us/edge/install-manage-or-uninstall-apps-in-microsoft-edge)

Edge のアプリインストール機能が使えない場合は、Windows でショートカットを作成できます。

1. デスクトップの空いている場所を右クリックし、「新規作成」から「ショートカット」を選びます。
2. 「項目の場所」に以下を入力し、「次へ」をクリックします。

   ```text
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=https://akiplaylab.github.io/block10/
   ```

   Edge が別の場所にインストールされている場合は、引用符内を実際の `msedge.exe` のパスに変更します。
3. 名前に「ブロック 10」と入力し、「完了」をクリックします。
4. [Block10.ico](https://akiplaylab.github.io/block10/Block10.ico) をダウンロードし、移動や削除をせずに保管できるフォルダーへ保存します。
5. ショートカットを右クリックして「プロパティ」を開き、「ショートカット」タブの「アイコンの変更」をクリックします。「参照」から保存した `Block10.ico` を選び、「OK」「適用」の順にクリックします。

## 保存データ

サウンド設定と学習履歴は端末上の LocalStorage に保存します。「10 をつくる」の履歴はクリア時に保存されます。最初のブロック数、選択肢、クリアまでの各回答と正誤、試行回数、ヒントの使用回数、経過時間、完了日時を記録します。従来の足し算の履歴は別のキーに保持されます。これらのデータはサーバーに送信されません。

本番の保存キーは `block10.`、テストの保存キーは `block10.test.` で始まります。
