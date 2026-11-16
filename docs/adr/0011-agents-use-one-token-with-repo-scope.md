# 11. Agents use one token with repo scope

Date: 2026-11-14
Status: Proposed

## Context

[ADR 0008](0008-agents-use-their-own-github-account.md) gives agents a classic
token with only `public_repo`, and says private repos need a separate token.
The owner works in private repos regularly, such as `mcp-toggle`, and is
comfortable with agents working in them too. Keeping a second, narrower token
for the worker would mean switching tokens for every private task.

GitHub allows one free machine account per person, so a second account isn't
an option.

## Decision

Agents use one classic token per machine on `evancogan-agent`, with `repo` (and
`read:org` if needed) and no `workflow` scope. The worker and the local-model
agents use it too. This changes only the token scope in ADR 0008; the rest of
ADR 0008 stands.

The token is safe to widen only because of these safeguards:

- Every repo the agent is invited to has a ruleset: one approval, no direct
  pushes to `main`, no force-push.
- The invitations are the access list. Invite the agent only to repos it
  should work in.
- The token expires no later than 2027-01-31, and unused tokens are revoked.

## Consequences

- Agents can work in private repos without switching tokens.
- The worker runs a local model that reads issue text, and it can now write to
  private repos. If the rulesets hold, the worst it can do is open branches and
  pull requests that a human must approve.
- Any process in the VM can read the token, so the VM stays isolated.
- A private repo without a ruleset is a gap. Add the ruleset before inviting
  the agent.
- Revisit with ADR 0008 when the token expires, or if the repos move into a
  GitHub organization.
