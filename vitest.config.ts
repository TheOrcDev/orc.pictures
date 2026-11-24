import { defineConfig } from "vitest/config";

// Vitest runs only the oracle files. The `@/` alias mirrors tsconfig's paths,
// so production modules load the way Next.js loads them.
//
// The @tanstack/oracles preview tarball ships its own node_modules with a
// second vitest and fast-check. Inlining it and deduping both makes the
// framework register its tests on the vitest that runs them.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//u, replacement: `${import.meta.dirname}/` }],
    dedupe: ["vitest", "fast-check"],
  },
  test: {
    include: ["tests/**/*oracle*.test.ts"],
    server: { deps: { inline: ["@tanstack/oracles"] } },
  },
});
