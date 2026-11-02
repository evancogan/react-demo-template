# 5. A planner writes issues, a worker solves them, a human approves both

Date: 2026-11-01
Status: Accepted

## Context

Writing every issue by hand meant copying out work a model had already
planned. A planner model (the 35B) wrote issue #17 well, but kept the
template's pre-filled `npm run check` item, which a worker limited to GitHub
tools can't run, and left out the exact text to use. A human had to edit it
before it was safe to hand over.

Agents use a token that acts as the human's GitHub account. GitHub can't tell
the two apart, so it can't require a separate approval or stop an agent from
merging.

## Decision

Every change goes through five steps. A human owns the first, third and last,
and agents never merge:

1. A human spots a problem or a task and notes it.
2. A planner agent writes it up as an issue and labels it `proposed`.
3. A human reviews and edits the issue, then relabels it `ready`.
4. A worker agent makes the change and opens a pull request.
5. A human reviews the diff against the issue's spec, and merges.

## Consequences

- Each run starts from an issue a human has read, so a worker can't act on an
  unchecked plan.
- The labels are only a convention until agents have their own GitHub account:
  nothing stops an agent from relabeling an issue `ready` itself. The rules
  live in AGENTS.md until then (#33), per ADR 0003.
- Revisit when agents get their own account and approval can be enforced by
  GitHub.
