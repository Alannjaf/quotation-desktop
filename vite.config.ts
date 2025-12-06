import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import path from "path";
import fs from "fs";

// Copy preload.cjs to dist-electron
function copyPreloadPlugin() {
  return {
    name: "copy-preload",
    writeBundle() {
      const src = path.resolve(__dirname, "electron/preload.cjs");
      const dest = path.resolve(__dirname, "dist-electron/preload.cjs");
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: "electron/main.ts",
        onstart(args) {
          args.startup();
        },
        vite: {
          build: {
            outDir: "dist-electron",
            rollupOptions: {
              external: ["electron"],
            },
          },
          plugins: [copyPreloadPlugin()],
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: "dist",
  },
});
