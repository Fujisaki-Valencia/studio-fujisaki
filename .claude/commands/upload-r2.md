---
description: 壁紙の pc/sp/uw をR2にアップロードし wallpapers.json にURLを反映する
argument-hint: <slug> [画像フォルダ (省略時 originals/<slug>)]
allowed-tools: Bash(node scripts/upload-r2.js:*), Bash(node scripts/add-wallpaper.js:*), Bash(ls:*), Bash(test:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Read
---

指定された壁紙のフルサイズ画像を Cloudflare R2 にアップロードし、`data/wallpapers.json` の
`pcUrl`/`spUrl`/`uwUrl` を実URLに書き換えるタスクです。

- slug: `$1`
- 画像フォルダ: `$2`（未指定なら `originals/$1`）

次の手順で進めてください。各ステップで問題があれば止めてユーザーに知らせること。

1. **前提チェック**
   - リポジトリ直下に `.env` があるか確認する。無ければ「`cp .env.example .env` で作成し、R2 の
     `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_BASE_URL` / `R2_ENDPOINT`
     を記入してください」と伝えて中断する。
   - 画像フォルダに `pc.jpg` `sp.jpg` `uw.jpg` の3点が揃っているか `ls` で確認する。
     欠けていれば、どれが無いかを伝えて中断する。

2. **アップロード実行**
   ```
   node scripts/upload-r2.js --slug $1 --dir <画像フォルダ>
   ```
   を実行する。認証情報は `.env` から読まれる（コマンドには渡さない）。

3. **結果判定**
   - 成功し、URL が `wallpapers.json` に書き込まれたら、出力された pcUrl/spUrl/uwUrl を要約して報告する。
   - もし「slug が wallpapers.json に見つからない」旨の警告が出たら、先に作品を追加する必要がある。
     ユーザーに「`add-wallpaper` で先に作品を追加してから再実行しますか？」と確認し、了承されたら
     `node scripts/add-wallpaper.js --title "…"`（必要な項目をユーザーに聞く）を実行してから
     もう一度アップロードする。

4. **公開反映の確認**
   - 変更後、`git add data/wallpapers.json` して commit / push するか**ユーザーに確認してから**行う。
     勝手に push はしない。

注意：
- 認証情報を画面に出したり、コマンド引数に含めたりしないこと。
- アップロードは外部への不可逆な操作なので、フォルダやslugに不審な点があれば実行前に確認すること。
