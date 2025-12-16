import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/CubeRoll/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        stats: resolve(__dirname, "stats.html"),
      },
    },
  },
});
