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
  // Global rule: block legacy imports everywhere (except legacy itself)
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
  // Rebuild surfaces: stricter enforcement (hard fail on any legacy import)
  {
    files: ["app/rebuild/**/*.ts", "app/rebuild/**/*.tsx", "lib/rebuild/**/*.ts", "lib/rebuild/**/*.tsx"],
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
                "../legacy/**",
                "../../legacy/**",
                "../../../legacy/**",
              ],
              message:
                "REBUILD ISOLATION: Rebuild surfaces must NEVER import from /legacy/**. This is a hard boundary.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
