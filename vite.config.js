import { defineConfig } from "vite";

// React の JSX は esbuild の自動ランタイムで変換する（プラグイン不要＝依存を最小に保つ）
// 同梱ライブラリの成果物に残るソースマップ参照を取り除く（.map は公開しないので、参照だけが残るのを防ぐ）
const stripMapRefs = { name: "strip-sourcemap-refs", generateBundle(_, bundle) {
  for (const f of Object.values(bundle)) {
    if (f.type === "asset" && /\.(mjs|js|css)$/.test(f.fileName)) f.source = Buffer.from(f.source).toString("utf8").replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, "\n");
    if (f.type === "chunk") f.code = f.code.replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, "\n");
  } } };

export default defineConfig({
  plugins: [stripMapRefs],
  base: "./",                       // サブディレクトリ配信でも動くよう相対パスで出力
  esbuild: { jsx: "automatic" },
  build: {
    outDir: "dist", sourcemap: false, target: "es2022", assetsInlineLimit: 0, chunkSizeWarningLimit: 1400,
    rollupOptions: { output: { manualChunks: { maplibre: ["maplibre-gl"], react: ["react", "react-dom"] } } },
  },
  server: { host: "127.0.0.1" },     // 開発サーバーを LAN に公開しない
  preview: { host: "127.0.0.1" },
});
