/*
 * Studio Fujisaki — サイト設定（1 箇所で管理）
 * ここだけ書き換えれば、ブランド名・各種URL を差し替えられます。
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
  KOFI_URL: "https://ko-fi.com/studiofujisaki",

  // --- 公開サイトのURL（OGP・sitemap 用の絶対URL生成に使用） ---
  // 独自ドメイン移行後はここを差し替える。末尾スラッシュなし。
  SITE_URL: "https://fujisaki-valencia.github.io/studio-fujisaki",

  // --- 既定のOGP画像（作品ページ以外で使用） ---
  // 相対パス。SITE_URL と結合して絶対URLになる。
  DEFAULT_OG_IMAGE: "mockups/01_hokusai-kumonokakehashi/macbook.webp",
  DEFAULT_OG_IMAGE_WIDTH: 900,
  DEFAULT_OG_IMAGE_HEIGHT: 675,

  // --- Pinterest ドメイン所有権確認 ---
  // 全ページの <head> に <meta name="p:domain_verify"> として出力される恒久タグ。
  // 確認完了後も削除しない（Rich Pins 等の信頼性に寄与）。
  PINTEREST_DOMAIN_VERIFY: "99f896f8781fa3d2088ea03de70da13a",
};
