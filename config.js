/*
 * Studio Fujisaki — サイト設定（1 箇所で管理）
 * ここだけ書き換えれば、ブランド名・各種URL・コレクション定義を差し替えられます。
 * ※ 認証情報（R2 のキー等）は絶対にここへ書かないこと。→ .env を使用（scripts/ 参照）
 */
window.CONFIG = {
  // --- ブランド ---
  BRAND_NAME: "Studio Fujisaki",
  TAGLINE: "Japandi wallpapers, made by someone who loves them too.",

  // --- 外部URL ---
  // フルサイズ画像を置く外部ストレージ（Cloudflare R2 想定）のベースURL。
  // JSON の pcUrl/spUrl は upload-r2 スクリプトがこの値を元に絶対URLで書き込みます。
  R2_BASE_URL: "https://pub-d55846f181c2469888431e86756175c8.r2.dev",
  // Ko-fi 投げ銭
  KOFI_URL: "https://ko-fi.com/REPLACE-ME",

  // --- 公開サイトのURL（OGP・sitemap 用の絶対URL生成に使用） ---
  // 独自ドメイン移行後はここを差し替える。末尾スラッシュなし。
  SITE_URL: "https://REPLACE-ME.example.com",

  // --- コレクション定義（色/ムード別・3つ） ---
  COLLECTIONS: [
    {
      slug: "ink-and-mist",
      name: "Ink & Mist",
      description:
        "Monochrome washes and quiet fog. Sumi-e blacks softening into pale grey.",
    },
    {
      slug: "sage-and-stone",
      name: "Sage & Stone",
      description:
        "Muted greens and mineral greys. Calm, grounded, and understated.",
    },
    {
      slug: "warm-sand",
      name: "Warm Sand",
      description:
        "Soft ochres and clay tones. Warm neutrals with a gentle glow.",
    },
  ],
};
