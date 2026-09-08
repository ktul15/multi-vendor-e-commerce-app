import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    settings: { react: { version: "19.2" } },
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  globalIgnores([
    "**/.next/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/dist/**",
    "backend/**",
    "storefront/**",
    "vendor_dashboard/**",
    "admin_panel/**",
  ]),
]);
