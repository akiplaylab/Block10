# ブロック 10

オレンジ色のブロックを 1 個ずつタップして、青色のブロックに足していくゲームです。1 段目が埋まると虹色の「10」に変わり、残りは 2 段目に並びます。15 問を順番に遊べます。

[ブロック 10 であそぶ](https://akiplaylab.github.io/Block10/)

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

ビルドは TypeScript の型チェックを実行し、静的ファイルを `dist/` に出力します。ビルド結果は、プレビューサーバーが表示する `/Block10/` の URL で確認できます。

## 自動デプロイ

変更は Pull Request を作成してレビューし、手動で `main` にマージします。`main` への push を契機に GitHub Actions が依存関係のインストール、テスト（設定されている場合）、型チェック、本番ビルドを行います。成功すると `dist/` を GitHub Pages に公開します。Actions タブの「Deploy to GitHub Pages」から `main` を選んで手動実行することもできます。

## iPad・iPhone のホーム画面に追加

1. Safari で[ゲームの公開ページ](https://akiplaylab.github.io/Block10/)を開きます。
2. 共有メニューから「ホーム画面に追加」を選びます。
3. 名前が「ブロック 10」であることを確認し、「追加」をタップします。

## Windows のデスクトップに追加

Microsoft Edge でゲームを開き、メニューの「アプリ」から「このサイトをアプリとしてインストール」を選びます。インストール後、`edge://apps` で「ブロック 10」の詳細を開き、「デスクトップ ショートカットの作成」を選びます。[Microsoft Edge のアプリの手順](https://support.microsoft.com/en-us/edge/install-manage-or-uninstall-apps-in-microsoft-edge)

Edge のアプリインストール機能が使えない場合は、Windows でショートカットを作成できます。

1. デスクトップの空いている場所を右クリックし、「新規作成」から「ショートカット」を選びます。
2. 「項目の場所」に以下を入力し、「次へ」をクリックします。

   ```text
   "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=https://akiplaylab.github.io/Block10/
   ```

   Edge が別の場所にインストールされている場合は、引用符内を実際の `msedge.exe` のパスに変更します。
3. 名前に「ブロック 10」と入力し、「完了」をクリックします。
4. [Block10.ico](https://akiplaylab.github.io/Block10/Block10.ico) をダウンロードし、移動や削除をせずに保管できるフォルダーへ保存します。
5. ショートカットを右クリックして「プロパティ」を開き、「ショートカット」タブの「アイコンの変更」をクリックします。「参照」から保存した `Block10.ico` を選び、「OK」「適用」の順にクリックします。

## 保存データ

サウンド設定と学習履歴は端末上の LocalStorage に保存します。履歴には完了した問題、完了日時、ヒントの使用回数、開始から完了までの経過時間が含まれます。これらのデータはサーバーに送信されません。
