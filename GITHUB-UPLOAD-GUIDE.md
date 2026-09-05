# GitHubへアップロードする方法

このZIPには、VTuber向け公式サイト・コミュニティ・配信内容ページの最新版コードが入っています。

## GitHubの画面からアップロードする場合

1. GitHubで新しいリポジトリを作成します。
2. 作成したリポジトリで「Add file」→「Upload files」を選択します。
3. このZIPを展開し、フォルダ内のファイルとフォルダをすべてドラッグします。
4. 画面下部の「Commit changes」を押します。

`node_modules`や`.env`は含める必要がありません。このZIPにも入っていません。

## VS Codeから確認する場合

Node.jsをインストールした状態で、VS Codeのターミナルから次を実行します。

```bash
npm install
npm run dev
```

PowerShellでスクリプト実行エラーになる場合は、次のように`npm.cmd`を使用します。

```powershell
npm.cmd install
npm.cmd run dev
```

## 主な編集場所

- `public/home.html`：公式ホームページ
- `public/home.css`：ホームページのデザイン
- `app/community/page.tsx`：コミュニティページ
- `app/community/community.css`：コミュニティページのデザイン
- `app/contents/page.tsx`：配信内容ページ
- `app/ranking/ranking.css`：配信内容ページのデザイン
- `lib/schedule.ts`：配信スケジュール
- `lib/ranking.ts`：配信動画の情報

## 注意事項

ログイン、投稿保存、画像投稿にはサーバー側のデータベースと画像保存領域が必要です。GitHub Pagesは静的サイト専用のため、このプロジェクトをそのまま公開しても、これらの機能は動作しません。GitHubはコードの保存・管理場所として利用してください。
