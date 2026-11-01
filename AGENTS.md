# Agent instructions

Rules for any AI agent working in this repo. Read this file and `docs/adr/`
before starting a task.

## Project

A React + TypeScript template, built with Vite and tested with Vitest. Every
demo project starts from this repo.

## Commands

- `npm ci` installs exact package versions. Use it on a fresh copy.
- `npm run dev` starts the dev server.
- `npm run format` formats all files with Prettier.
- `npm run check` runs every CI check: format, lint, typecheck, tests, build.

## Rules

- Work on one issue at a time, on its own branch. Never commit to `main`.
- Only change the files listed in the issue's "Where" section.
- Run `npm run check` before finishing. The task isn't done until it passes.
- Never edit or delete a test to make it pass. If a test looks wrong, stop and
  say so.
- Don't add, remove or upgrade packages unless the issue asks for it.
- Respect the decisions in `docs/adr/`. For example, TypeScript stays on
  version 6 (see ADR 0001).
- Use LF line endings and follow the Prettier style in `.prettierrc.json`.
- Don't add AI attribution (such as `Co-Authored-By` lines or "Generated with")
  to commits or pull requests.
- In the pull request, write `Closes #N`, summarize what changed, and say
  plainly what you didn't finish or couldn't verify.

## When to stop and ask

- The fix needs a file that isn't listed in the issue's "Where".
- The issue can be read two ways that lead to different code.
- `npm run check` still fails after three attempts at a fix.
- A test fails and the test itself looks wrong.
- The task would mean adding or upgrading a package, or going against an ADR.
