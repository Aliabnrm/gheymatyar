import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["src/services/**/*.{ts,tsx}", "src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/**", "@/components/**", "**/features/**", "**/components/**"],
              message: "Infrastructure and services must not depend on feature UI.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/**",
                "@/components/**",
                "@/services/**",
                "**/features/**",
                "**/components/**",
                "**/services/**",
              ],
              message: "Core must stay independent of feature services and UI.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/model/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "react",
                "react/**",
                "next",
                "next/**",
                "@tanstack/**",
                "**/components/**",
                "**/hooks/**",
              ],
              message: "Presentation models must remain pure and framework-independent.",
            },
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts"]),
]);
