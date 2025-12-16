import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/CubeRoll/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        stats: resolve(__dirname, "stats.html"),
        levelEditor: resolve(__dirname, "editor.html"),
      },
    },
  },
  publicDir: "assets",
});
