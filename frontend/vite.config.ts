import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version as string),
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
