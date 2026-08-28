import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: rootDir,
  base: "./",
  plugins: [react()],
  build: {
    outDir: resolve(rootDir, "../hostinger-dist"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
