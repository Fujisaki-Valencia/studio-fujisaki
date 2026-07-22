---
description: originals/<slug> の画像から、サムネ生成・JSON登録・モック・R2アップロード・ページ生成・公開までを一気に通す
argument-hint: <slug>（originals/<slug>/ に pc・sp・uw を置いてから実行）
allowed-tools: Bash(node scripts/gen-thumb.js:*), Bash(node scripts/add-wallpaper.js:*), Bash(node scripts/gen-mockups.js:*), Bash(node scripts/upload-r2.js:*), Bash(node scripts/gen-pages.js:*), Bash(node scripts/gen-sitemap.js:*), Bash(ls:*), Bash(test:*), Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Read
---

新規壁紙 `$1` を、画像の取り込みから公開まで一気に通すタスクです。

**重要な原則：R2 へのアップロード（手順6）は取り消せない外部操作です。**
ローカルで完結する手順1〜5をすべて成功させてから、はじめて手順6に進むこと。
途中で失敗したらそこで止め、アップロードには進まないこと。

---

1. **前提チェック**
   - リポジトリ直下に `.env` があるか確認する。無ければ「`cp .env.example .env` で作成し、R2 の
     `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` / `R2_ENDPOINT`
     を記入してください」と伝えて中断する。
   - `ls originals/$1` で `pc` `sp` `uw`（`.jpg`/`.png`/`.webp` いずれか）の3点が揃っているか確認する。
     欠けていれば、どれが無いかを伝えて中断する。
   - ついでに `mockup-*` があるかも見ておく（手順5で使う）。

2. **メタ情報の確認**
   - `data/wallpapers.json` を Read し、`$1` が既に登録済みか確認する。
     - **登録済み**なら手順3・4は飛ばし、手順5へ進む（既存作品の再アップロードとみなす）。
     - **未登録**なら、以下をユーザーに聞く。まとめて1回で聞くこと。
       - title（必須）
       - artist / era / museum（任意・空でよい）
   - 既に会話の中で指定されている項目は聞き直さない。

3. **サムネイル生成**
   ```
   node scripts/gen-thumb.js originals/$1/pc.<ext> $1
   ```
   → `thumbs/$1.webp` を出力。
   **手順4より先に必ず実行すること。** `add-wallpaper` はサムネが無いと検証エラーで落ちる。

4. **wallpapers.json に登録**
   ```
   node scripts/add-wallpaper.js --slug $1 --title "…" [--artist "…"] [--era "…"] [--museum "…"]
   ```
   - `--slug` は**必ず明示する**。省略するとタイトルから自動生成され、`01_foo` のような連番付き slug が
     `01-foo` に変換されて R2 のパスと食い違う。
   - この時点では pcUrl/spUrl/uwUrl はプレースホルダで入る（手順6で実URLに置き換わる）。

5. **デバイスモック**（あれば）
   - `originals/$1/` に `mockup-*` があれば実行する:
     ```
     node scripts/gen-mockups.js --slug $1
     ```
   - 素材が無ければ飛ばしてよい。ただし **og:image がサムネ（600×338）にフォールバックする**ことを
     最終報告に明記する（作品ページの OGP 画像は MacBook モックを使うため）。

6. **R2 へアップロード**（ここから不可逆）
   ```
   node scripts/upload-r2.js --slug $1 --dir originals/$1
   ```
   - 認証情報は `.env` から読まれる。コマンド引数にも画面にも出さないこと。
   - 成功すると pcUrl/spUrl/uwUrl が実URLで `wallpapers.json` に書き戻される。

7. **作品ページと sitemap を生成**
   ```
   node scripts/gen-pages.js --prune
   node scripts/gen-sitemap.js
   ```
   - `gen-pages` がファイル名衝突で中断したら、出力された理由をそのまま伝えて止める。

8. **コミット & push（ユーザー確認のうえで）**
   - `git status --short` で変更内容を提示し、push してよいか**確認を取る**。勝手に push しない。
   - 了承されたら `git add -A` → commit → `git push origin main`。

9. **報告**
   - pcUrl / spUrl / uwUrl
   - 作品ページのURL（`https://<SITE_URL>/<page>.html`）— Pinterest 投稿時のリンク先
   - og:image がモックかサムネか
   - 次にやること：本番反映を確認 → ピン画像を用意（リポジトリ外）→ Pinterest に投稿
   - 後片付けが必要なら `/delete-originals $1` を案内する

---

注意：
- 認証情報を画面に出したり、コマンド引数に含めたりしないこと。
- slug やフォルダに不審な点があれば、手順6より前に確認すること。
- 手順7を飛ばさないこと。作品ページの `<head>` は静的生成なので、これを回さないと新作がサイトに出ず、
  Pinterest のクローラからも見えない。
