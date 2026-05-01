// @ts-check
import { FlatCompat } from "@eslint/eslintrc"
import { fileURLToPath } from "node:url"
import { dirname } from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

/**
 * Files exempted from the `no-bare-db` rule.
 *
 * Allowed to import directly from "@/lib/db":
 *  - src/lib/db/**            (the module itself)
 *  - src/lib/tenant/**        (the only sanctioned wrapper around db)
 *  - src/lib/auth/auth.ts     (Auth.js DrizzleAdapter requires raw db)
 *  - src/lib/email/templates/ (rendered in isolation, no DB calls expected
 *                              but kept as exception for future RSC templates)
 *  - drizzle.config.ts        (drizzle-kit CLI config)
 *  - eslint.config.mjs        (this file)
 */
const NO_BARE_DB_EXCEPTIONS = [
  "src/lib/db/**",
  "src/lib/tenant/**",
  "src/lib/auth/auth.ts",
  "src/lib/email/templates/**",
  "drizzle.config.ts",
  "eslint.config.mjs"
]

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "docs/book/**",
      "public/**"
    ]
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: NO_BARE_DB_EXCEPTIONS,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/db",
              message:
                "Direct '@/lib/db' import is forbidden. Use TenantScope via '@/lib/tenant/with-tenant' instead. Tenant isolation depends on this rule."
            }
          ],
          patterns: [
            {
              group: ["@/lib/db/*"],
              message:
                "Direct '@/lib/db/*' subpath import is forbidden. Use TenantScope via '@/lib/tenant/with-tenant' instead."
            }
          ]
        }
      ]
    }
  }
]

export default config
