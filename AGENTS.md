# Agent instructions

Rules for any AI agent working in this repo. Read only what your task needs:
this file, the issue, the files in its "Where" section, and the template
you're filling in. Read an ADR in `docs/adr/` only if the issue links it.

Read the issue with the GitHub tool `issue_read`. Take the owner and repo from
`git remote -v`; don't type them from memory.

## Project

A React + TypeScript template, built with Vite and tested with Vitest. Every
demo project starts from this repo.

## Commands

- `npm ci` installs exact package versions. Use it on a fresh copy.
- `npm run dev` starts the dev server.
- `npm run format` formats all files with Prettier.
- `npm run check` runs every CI check: format, lint, typecheck, tests, build.

## Rules

- Work on one issue at a time, on a branch named `issue-<number>`. Never
  commit to `main`.
- Only change the files listed in the issue's "Where" section.
- Never edit or delete a test to make it pass. If a test looks wrong, stop and
  say so.
- Don't add, remove or upgrade packages unless the issue asks for it.
- TypeScript stays on version 6 (ADR 0001).
- Don't add AI attribution (such as `Co-Authored-By` lines or "Generated with")
  to commits or pull requests.
- Templates are read-only. Copy `.github/pull_request_template.md` into the
  pull request's description, or a file from `.github/ISSUE_TEMPLATE/` into the
  issue's body, and fill it in there. Never edit the template files unless the
  issue's "Where" lists them.
- In the pull request's description, fill in every section and follow the
  checklist rule. Say plainly what you didn't finish or couldn't verify.
- When the change is done, commit it, push the branch and open a pull request.
- Never force-push. If a push is rejected, stop and say so.
- Never merge a pull request. A human merges after review.
- Only work on issues labeled `ready`. If an issue isn't labeled `ready`,
  stop and say so.
- When you write an issue, label it `proposed`, never `ready`.

## When to stop and ask

- You can't read the issue. Don't guess what it says.
- The fix needs a file that isn't listed in the issue's "Where".
- The issue can be read two ways that lead to different code.
- `npm run check` still fails after three attempts at a fix.
- A test fails and the test itself looks wrong.
- The task would mean adding or upgrading a package, or going against an ADR.
