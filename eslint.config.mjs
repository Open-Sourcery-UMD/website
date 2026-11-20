import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Project rules. Last, so they win over the presets above.
  {
    rules: {
      // Dropping a field by naming it and spreading the rest is how a profile
      // is stripped of a legacy password hash; the named half is meant to go
      // unused (getUserProfile, lib/userService.ts).
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],

      // react-hooks v6 brings the React Compiler's rules, and these two flag
      // patterns this codebase is built on: effects that set state the moment
      // they know something - a mount flag, a prefetched roster, a cached
      // total. Reworking them is its own piece of work, with real behaviour
      // riding on it, so they report without failing the run.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },

  {
    // The oldest module here. GitHub's REST and GraphQL payloads are walked as
    // plain JSON rather than mirrored in handwritten types, and the GraphQL
    // pagination loop needs `any` outright: typing it makes TypeScript infer
    // in circles (TS7022). Writing real response types is tracked separately.
    files: ["src/lib/githubApi.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
]);

export default eslintConfig;
