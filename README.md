# Studio Fujisaki

静かでミニマルな **Japandi 壁紙** を配布する無料サイト。ジャンルや出典を限定せず、雰囲気で選んでキュレーションします。
**素の HTML + CSS + バニラ JS** による静的サイトで、ビルド不要。GitHub に push すればそのまま公開されます。

- 静かでミニマルなライト基調の Japandi デザイン（将来 CSS 変数で Dark Japandi 版を追加可能）。
- 作品データは単一ファイルに集約：[`data/wallpapers.json`](data/wallpapers.json)。
- カードや各ページは、その JSON から JS で動的生成。
- サムネイル（軽量 WebP）はリポジトリに含める。**フルサイズ画像は外部ストレージ（Cloudflare R2）に置き**、git には含めない。
- 各壁紙は **標準3点セット** — PC (4K) / スマホ / ウルトラワイド — で提供。R2 上では `/{slug}/pc.jpg`・`/{slug}/sp.jpg`・`/{slug}/uw.jpg` に保存。

---

## ディレクトリ構成

```
studio-fujisaki/
├── index.html            トップ：紹介 + おすすめ壁紙9件（新着順）+ VIEW MORE
├── gallery.html          全壁紙の一覧グリッド（新着順）
├── wallpaper.html        作品個別ページ               (?slug=<slug>)
├── about.html
├── privacy.html          AdSense 対応の雛形（Cookie / アクセス解析の記載欄）
├── license.html          License / Credits
├── 404.html
├── config.js             ← 編集箇所：ブランド・各種URL・コレクション（1箇所で管理）
├── assets/
│   ├── css/style.css
│   └── js/{site,home,gallery,wallpaper}.js
├── data/wallpapers.json  ← 作品データの唯一の源
├── thumbs/               WebP サムネイル（600px・リポジトリに含める）
├── scripts/              gen-thumb · add-wallpaper · upload-r2 (+ gen-sitemap)
├── sitemap.xml  robots.txt
├── .env.example          .env にコピーして使う（git 除外）R2 認証情報用
└── .gitignore
```

**パスは意図的にすべて相対パス。** サイト内リンク・CSS/JS・サムネは、先頭スラッシュや絶対URLを一切使いません。
そのためプロジェクトのサブパス（`user.github.io/studio-fujisaki/`）でも、後から独自ドメインのルートに移しても動作します。
**唯一の絶対URL**は、R2 を指すフルサイズ画像リンク（`pcUrl`/`spUrl`/`uwUrl`）だけです。

---

## セットアップ

サイト自体は静的なのでビルドツールは不要です。ローカルで確認する場合は、フォルダを HTTP で配信してください
（JSON を `fetch` で読み込むため、`file://` では動きません）：

```bash
# 任意の静的サーバでOK。例（Node インストール済みの場合）:
npx serve .
# 表示された http://localhost:... を開く
```

補助スクリプトを使う場合は、最初に一度だけ依存関係をインストールします：

```bash
cd scripts
npm install
```

---

## `config.js` — 置き換える箇所

サイト全体の設定は [`config.js`](config.js) の1箇所に集約されています。プレースホルダを差し替えてください：

| 定数            | 差し替える内容                                                       |
|-----------------|---------------------------------------------------------------------|
| `BRAND_NAME`    | ブランド名（初期値 `Studio Fujisaki`）                              |
| `TAGLINE`       | キャッチコピー                                                     |
| `R2_BASE_URL`   | R2 バケットの公開ベースURL（`.env` の `R2_PUBLIC_BASE_URL` と一致させる） |
| `KOFI_URL`      | あなたの Ko-fi ページ                                              |
| `SITE_URL`      | 公開サイトのURL（OGP / sitemap の絶対URL生成に使用）               |
| `COLLECTIONS`   | コレクションの slug / 表示名 / 説明                                |

あわせて **`sitemap.xml`** と **`robots.txt`** 内の `https://REPLACE-ME.example.com` も実URLに置き換えてください
（または `npm run gen-sitemap -- --base https://your-domain.com` で sitemap を再生成）。

---

## `.env` — 認証情報（絶対にコミットしない）

R2 の認証情報は**コードに直書きしません**。テンプレートをコピーして記入します：

```bash
cp .env.example .env      # .env は git 除外済み。そのまま除外を維持すること
```

`.env` に設定する項目：

| 変数                    | 意味                                                        |
|------------------------|-------------------------------------------------------------|
| `R2_ACCOUNT_ID`        | Cloudflare のアカウントID                                   |
| `R2_ACCESS_KEY_ID`     | R2 アクセスキー                                             |
| `R2_SECRET_ACCESS_KEY` | R2 シークレットキー                                         |
| `R2_BUCKET`            | バケット名（例 `studio-fujisaki`）                          |
| `R2_PUBLIC_BASE_URL`   | バケットを配信する公開ベースURL（`config.js` と一致させる） |
| `R2_ENDPOINT`          | S3 API エンドポイント `https://<account_id>.r2.cloudflarestorage.com` |

> ⚠️ **`.env` は絶対にコミットしないこと。** `.gitignore` で除外済みです。このリポジトリは public のため、
> 認証情報をコミットするとストレージが露出します。`upload-r2` スクリプトはこれらの値を**環境変数からのみ**読み込みます。

---

## GitHub Pages での公開

1. **public** の GitHub リポジトリを作成し、このフォルダを push する。
2. リポジトリの **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`、フォルダ `/ (root)` → Save。
3. 緑のチェックが付くまで待つ。サイトは `https://<user>.github.io/<repo>/` で公開されます。

サイト内パスはすべて相対なので、プロジェクトのサブパスURLのままで問題なく動作します。

> 補足：初回だけビルドが自動トリガーされないことがあります。その場合は空コミットを push すると起動します：
> `git commit --allow-empty -m "Trigger Pages build" && git push`
> 一度公開されれば、以降は **`main` に push するたびに自動で再デプロイ**されます。

---

## 新規作品の追加手順（ステップ順）

フルサイズ画像は git に含めず、コミットするのは WebP サムネイルだけです。

```
1. フルサイズ画像を作業用フォルダ（git 除外）に、以下の名前で正確に置く
   （標準3点セット）:
      originals/<slug>/pc.jpg     (デスクトップ / 4K)
      originals/<slug>/sp.jpg     (スマホ / 縦)
      originals/<slug>/uw.jpg     (ウルトラワイド)

2. サムネイルを生成:
      cd scripts
      node gen-thumb.js ../originals/<slug>/pc.jpg <slug>
   → thumbs/<slug>.webp を出力

3. フルサイズ画像を R2 にアップロード（認証情報は .env から読込）:
      node upload-r2.js --slug <slug> --dir ../originals/<slug>
   → pc.jpg / sp.jpg / uw.jpg をアップロードし、pcUrl/spUrl/uwUrl を wallpapers.json に反映

4. メタデータのブロックを追記（slug 自動生成、JSON・必須項目・thumb 存在を検証）:
      node add-wallpaper.js --title "…" --artist "…" --era "…" \
                            --museum "…" --collection <collection-slug>
   （フラグ無しで実行すると対話モード）

   ヒント: 先に add-wallpaper を実行してもよい。その場合 upload-r2 が
   見つけた作品に実URLを埋め込む。どちらの順でも動く。

5. （任意）sitemap を再生成:
      node gen-sitemap.js --base https://your-domain.com

6. コミット & push:
      git add data/wallpapers.json thumbs/<slug>.webp sitemap.xml
      git commit -m "Add <slug>"
      git push
```

### スクリプト一覧

| スクリプト        | 役割                                                                         |
|-------------------|------------------------------------------------------------------------------|
| `gen-thumb`       | フル画像 → 幅600px の WebP サムネを `/thumbs` に出力（`sharp` を使用）。      |
| `add-wallpaper`   | 検証済みブロックを `wallpapers.json` に1件追記（slug 自動生成／JSON構文・必須項目・thumb 存在・slug 重複を検証）。フラグまたは対話。 |
| `upload-r2`       | `pc.jpg`/`sp.jpg`/`uw.jpg` を R2 にアップロード（S3互換・`@aws-sdk/client-s3`）し、`pcUrl`/`spUrl`/`uwUrl` を JSON に書き戻す。認証情報は `.env` からのみ。 |
| `gen-sitemap`     | （おまけ）JSON から `sitemap.xml` を再生成。                                 |

`wallpapers.json` のスキーマ（1作品あたり）：

```json
{
  "slug": "…", "title": "…", "artist": "…", "era": "…", "museum": "…",
  "collection": "ink-and-mist | sage-and-stone | warm-sand",
  "thumb": "thumbs/<slug>.webp",
  "pcUrl": "https://<r2-base>/<slug>/pc.jpg",
  "spUrl": "https://<r2-base>/<slug>/sp.jpg",
  "uwUrl": "https://<r2-base>/<slug>/uw.jpg"
}
```

（タブレット版は持ちません。`pcUrl`/`spUrl`/`uwUrl` が必須の3点ダウンロードセットです。
項目は自由に追加でき、レンダラは未知のキーを無視します。）

---

## 独自ドメインへの移行

1. **Settings → Pages → Custom domain** にドメインを追加（GitHub Pages が `CNAME` ファイルを自動作成）。
2. レジストラ側で DNS を設定（`<user>.github.io` への `CNAME`、または apex ドメインなら4つの A レコード。GitHub のドキュメント参照）。
3. `config.js` の `SITE_URL` と、`robots.txt` / `sitemap.xml` のホストを更新
   （または `npm run gen-sitemap -- --base https://your-domain.com`）。
4. 他は変更不要：サイト内リンクは相対なので、ベースがサブパスからドメインのルートに移っても動き続けます。

---

## クレジットとライセンス

壁紙は **無料・個人利用可** ですが、再販はしないでください。作者や出典が分かる作品は、各作品ページに
その情報（`artist` / `era` / `museum` などのフィールド）を明記します — クレジットはページ上に表示し、画像には焼き込みません。
これらのフィールドは任意で、無い作品は該当行を表示しません。詳細は `license.html` を参照してください。
