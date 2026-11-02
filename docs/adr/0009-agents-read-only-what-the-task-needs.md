# 9. Agents read only what the task needs

Date: 2026-11-02
Status: Accepted

## Context

AGENTS.md told agents to read it and all of `docs/adr/` before every task.
In the worker runs on issue #50, a one-paragraph README change, every model
that reached the edit made it correctly. The failures came from what they
read:

- LFM3-1.7B read all nine ADRs, the run log and the comparison plan, and ran
  out of its 32K context within two minutes. A prompt saying "read only the
  issue, README.md and the pull request template" didn't stop it, because
  AGENTS.md is injected into every chat and says otherwise.
- Asked to fill in the pull request template, LFM3 edited and committed
  `.github/pull_request_template.md` itself (#51), then ticked "Only files in
  the issue's 'Where' changed". The description check read the checklist from
  the pull request's own copy of the template, so the edit also emptied the
  list of items it checked. Qwen3.5-9B made the same mistake as a planner,
  rewriting `.github/ISSUE_TEMPLATE/task.md` instead of opening an issue.
- 1-bit Bonsai 27B copied the owner from the prompt as `evanchogan`, and every
  GitHub call failed.

## Decision

Agents read this file, the issue, the files in its "Where" and the template
they're filling in. They read an ADR only when the issue links it, so the
planner and the human reviewing the issue (ADR 0005) decide which decisions
apply. Agents read the issue with `issue_read`, taking the owner and repo from
`git remote -v`.

Templates are read-only. CI enforces it: the description check reads the
checklist from the base branch, and fails a pull request that changes a
template unless the linked issue's "Where" lists that file.

## Consequences

- Workers start with a few thousand tokens of context instead of 30K, which
  leaves room for small models.
- An agent may break an ADR it never read. CI catches what it checks (format,
  lint, types, tests, build); anything else has to be written into the
  issue's Constraints or linked there.
- The task template's Constraints hint now says to link the ADRs a worker
  needs.
- Revisit if issues keep missing a decision that a worker needed.
