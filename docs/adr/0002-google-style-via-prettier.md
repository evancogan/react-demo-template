# 2. Use Google's formatting style through Prettier instead of gts

Date: 2026-10-31
Status: Accepted

## Context

We wanted Google's TypeScript style guide, normally set up with the `gts`
package. Running `npx gts init` (gts 7.0.0) on this Vite React project showed
that gts targets plain Node projects and lags this toolchain:

- It wanted TypeScript `^5.6.3` and `@types/node` 22, older than ours.
- It depends on ESLint 9, which is deprecated; the project uses ESLint 10.
- It wrote CommonJS config files (`module.exports`) that break in a project
  with `"type": "module"`.
- It added scripts (`prepare` running plain `tsc`) that conflict with Vite's
  split tsconfig setup and would run on every install.

## Decision

Don't install gts. Keep Vite's ESLint config for linting, put gts's Prettier
settings directly in `.prettierrc.json`, and keep the `.editorconfig` that gts
generated.

## Consequences

- Code is formatted in Google's style (single quotes, no bracket spacing,
  ES5 trailing commas, no parentheses around single arrow parameters).
- Lint rules are Vite's React set, not gts's full rule set.
- Formatting isn't enforced automatically yet. Add `prettier --check .` to CI
  so unformatted code can't merge.
- Revisit if gts adds support for ESLint 10 and ES module projects.
