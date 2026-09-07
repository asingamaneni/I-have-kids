import js from "@eslint/js";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const config = [
  { ignores: ["**/.next/**", "**/dist/**", "**/coverage/**", "plugin/hooks/scripts/child-learning-mcp.mjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  ...nextTypeScript,
  { rules: { "@next/next/no-html-link-for-pages": "off" } }
];

export default config;
