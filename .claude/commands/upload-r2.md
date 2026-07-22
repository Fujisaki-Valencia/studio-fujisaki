---
description: 既存作品の pc/sp/uw をR2に再アップロードし、作品ページ・sitemap を再生成して公開まで通す
argument-hint: <slug> [画像フォルダ (省略時 originals/<slug>)]
allowed-tools: Bash(node scripts/upload-r2.js:*), Bash(node scripts/add-wallpaper.js:*), Bash(node scripts/gen-mockups.js:*), Bash(node scripts/gen-pages.js:*), Bash(node scripts/gen-sitemap.js:*), Bash(ls:*), Bash(test:*), Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Read
---

**既に `wallpapers.json` に登録済みの**壁紙について、画像を R2 に上げ直して公開まで通すタスクです。
画像の差し替えや、アップロードだけ失敗した場合のやり直しに使います。

**新規の壁紙は `/new-wallpaper $1` を使うこと。** サムネ生成と JSON 登録が要るため、
このコマンドだけでは完結しません。

- slug: `$1`
- 画像フォルダ: `$2`（未指定なら `originals/$1`）

次の手順で進めてください。各ステップで問題があれば止めてユーザーに知らせること。

1. **前提チェック**
   - リポジトリ直下に `.env` があるか確認する。無ければ「`cp .env.example .env` で作成し、R2 の
     `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` / `R2_ENDPOINT`
     を記入してください」と伝えて中断する。
   - 画像フォルダに `pc` `sp` `uw`（`.jpg`/`.png`/`.webp` いずれか）の3点が揃っているか `ls` で確認する。
     欠けていれば、どれが無いかを伝えて中断する。

2. **アップロード実行**
   ```
   node scripts/upload-r2.js --slug $1 --dir <画像フォルダ>
   ```
   を実行する。認証情報は `.env` から読まれる（コマンドには渡さない）。

   - もし「slug が wallpapers.json に見つからない」旨の警告が出たら、これは新規の壁紙なので
     このコマンドの対象外。**`/new-wallpaper $1` を案内して中断すること。**

3. **モックアップの確認**（作品ページの og:image に使われるため、ページ生成より前に）
   - `data/wallpapers.json` の該当作品に `mockups` があるか Read で確認する。
   - 無く、かつ画像フォルダに `mockup-*.png` 等が置かれている場合は
     `node scripts/gen-mockups.js --slug $1` を実行して登録する。
   - 素材も無い場合は中断せず進めてよい。ただし **og:image がサムネ（600×338）にフォールバックする**ことを
     報告に明記する。

4. **作品ページと sitemap を再生成**
   ```
   node scripts/gen-pages.js --prune
   node scripts/gen-sitemap.js
   ```
   - `gen-pages` はファイル名衝突があると中断する。その場合は出力された理由をそのまま伝えて止める。
   - 生成された `<page>.html` のファイル名を報告に含める（Pinterest 投稿時のリンク先になる）。

5. **コミット & push（ユーザー確認のうえで）**
   - `git status --short` で変更内容を提示し、push してよいか**確認を取る**。勝手に push しない。
   - 了承されたら `git add -A` → commit → `git push origin main`。
   - push 後、GitHub Pages への反映には数十秒〜数分かかることを伝える。

6. **報告**
   - pcUrl / spUrl / uwUrl
   - 生成された作品ページのURL（`https://<SITE_URL>/<page>.html`）
   - og:image がモックかサムネか
   - 次にやること：本番反映を確認してから Pinterest に投稿（ピン画像はリポジトリ外で用意する）

注意：
- 認証情報を画面に出したり、コマンド引数に含めたりしないこと。
- アップロードは外部への不可逆な操作なので、フォルダやslugに不審な点があれば実行前に確認すること。
- **手順4を飛ばさないこと。** 作品ページの `<head>` は静的生成なので、これを回さないと新作がサイトに出ず、
  Pinterest のクローラからも見えない。
