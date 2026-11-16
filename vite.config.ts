import path from "node:path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command }) => ({
  server: { port: 8080 },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // Серверная точка входа — src/server.ts (обёртка SSR-ошибок)
    tanstackStart({ server: { entry: "server" } }),
    // Сборка в Node-сервер: `npm run build` → `npm start`
    command === "build" ? nitro() : null,
    viteReact(),
  ],
}));
