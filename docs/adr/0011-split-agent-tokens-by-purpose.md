# 11. Split agent tokens by purpose

Date: 2026-11-14
Status: Proposed

## Context

[ADR 0008](0008-agents-use-their-own-github-account.md) gives agents one
classic token with only `public_repo`, and says private repos need a separate
token. Private work, such as `mcp-toggle`, now needs to be reachable by an
agent. Putting `repo` on the existing token would also give the worker, which
runs a local model that reads issue text, write access to every private repo
the account is invited to.

GitHub allows one free machine account per person, so a second account isn't
an option.

## Decision

Both tokens belong to `evancogan-agent` and stay classic (ADR 0008), expiring
no later than 2027-01-31. They differ in scope and in where they live.

- **Public token:** `public_repo` only. It is the only token the worker and
  the local-model agents get.
- **Private token:** adds `repo` (and `read:org` if needed). Only interactive
  Claude sessions use it. It is never put in the worker's environment or in
  its `token.txt`.

The unused Bionic GitHub MCP token is revoked.

## Consequences

- A leaked or misled worker can still only reach public repos.
- Repo access still follows the invitations on `evancogan-agent`; a token's
  scope doesn't widen it. A private repo needs a ruleset (one approval, no
  direct pushes to `main`) before the private token is used on it.
- Whoever switches between public and private work has to switch tokens.
- This extends ADR 0008; it doesn't supersede it. Revisit with ADR 0008 when
  the tokens expire, or if the repos move into a GitHub organization.
