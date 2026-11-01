# 1. Pin TypeScript to version 6

Date: 2026-10-31
Status: Accepted

## Context

The Vite React + TypeScript template (create-vite 9.3.3) installs TypeScript
7.0.2. Linting uses typescript-eslint 8.x, which only accepts TypeScript
`>=4.8.4 <6.1.0`, so `npm install` failed with an `ERESOLVE` peer dependency
error.

Forcing the install with `--force` or `--legacy-peer-deps` doesn't help:
TypeScript 7 doesn't expose the API typescript-eslint relies on, so ESLint
crashes instead. typescript-eslint has no TypeScript 7 support yet
(typescript-eslint issues #12518 and #10940).

Options considered:

- TypeScript 6 for everything.
- TypeScript 7 for compiling, plus TypeScript 6 installed under an alias for
  linting only.
- Drop typescript-eslint and lint without type information.

## Decision

Pin `typescript` to `~6.0.3` for the whole project.

## Consequences

- Install, lint, test and build all work with one TypeScript version.
- We miss TypeScript 7's faster native compiler for now.
- Don't upgrade TypeScript until typescript-eslint supports version 7. When it
  does, write a new record that supersedes this one.
