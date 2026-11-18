import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const serverOnly = {
  name: "server-only",
  message:
    "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
};

/**
 * Правило зависимостей Clean Architecture: внутренние слои не знают о внешних.
 *   domain ← application ← infrastructure / presentation;  di соединяет всё.
 */
const layer = (forbidden, why) => ({
  "no-restricted-imports": [
    "error",
    {
      paths: [serverOnly],
      patterns: [{ group: forbidden, message: why }],
    },
  ],
});

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: layer(
      ["@/application/*", "@/infrastructure/*", "@/presentation/*", "@/di/*", "@/routes/*", "react", "react-dom", "three", "@react-three/*", "@tanstack/*"],
      "domain — ядро: только чистый TypeScript, без фреймворков и внешних слоёв.",
    ),
  },
  {
    files: ["src/application/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: layer(
      ["@/infrastructure/*", "@/presentation/*", "@/di/*", "@/routes/*", "react", "react-dom", "three", "@react-three/*"],
      "application зависит только от domain и своих портов.",
    ),
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: layer(["@/presentation/*", "@/di/*", "@/routes/*"], "infrastructure реализует порты и не знает об интерфейсе."),
  },
  {
    files: ["src/presentation/**/*.{ts,tsx}", "src/routes/**/*.{ts,tsx}"],
    rules: layer(["@/infrastructure/*"], "presentation получает реализации только через @/di/container."),
  },
  eslintPluginPrettier,
);
