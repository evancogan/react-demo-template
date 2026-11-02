# 4. Pin the CI runner and the Node version

Date: 2026-11-01
Status: Accepted

## Context

Two parts of the toolchain could change without anyone choosing to change
them:

- CI ran on `ubuntu-latest`, which GitHub moves to new Ubuntu versions on its
  own schedule. It had already moved from 24.04 to 26.04 (issue #9).
- CI hard-coded Node 24, and each machine used whatever Node was installed, so
  the desktop, the laptop and CI could run different versions (issue #15).

## Decision

Pin the runner to `ubuntu-26.04`, the version CI was already green on (#10).
Keep the Node major version in `.nvmrc` (24) as the one source: CI reads it
with `node-version-file`, and `package.json` declares `"engines": {"node":
"^24"}` so npm warns on any other major version (#16).

## Consequences

- CI and both machines only change when we choose to upgrade.
- `^24` accepts Node 24 minor and patch updates but not Node 25 or 26. To
  upgrade, change `.nvmrc` and `engines` in the same pull request.
- Revisit when GitHub announces the end of support for `ubuntu-26.04`, or when
  Node 24 reaches end of life.
