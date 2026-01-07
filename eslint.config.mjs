import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      ".cache/**",
      "scripts/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "legacy/*",
                "legacy/**",
                "@/legacy/*",
                "@/legacy/**",
                "**/legacy/**",
              ],
              message:
                "Legacy quarantine is reference-only. Do not import from /legacy/**.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
