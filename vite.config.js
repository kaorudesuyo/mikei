import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages のサブパスに置く場合は base を "/<repo>/" に変更する
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          recharts: ["recharts"],
        },
      },
    },
  },
});
