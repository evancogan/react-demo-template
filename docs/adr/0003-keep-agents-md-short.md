# 3. Keep AGENTS.md short

Date: 2026-11-01
Status: Accepted

## Context

Every agent reads all of AGENTS.md before every task, so every rule in it
takes up part of the agent's attention. Some of its rules were already
handled by something else:

- Line endings: `.gitattributes` turns every file into LF when it's
  committed.
- Formatting: CI runs `prettier --check` and fails the pull request if a file
  isn't formatted.
- Passing checks: CI runs the same checks as `npm run check` on every pull
  request, and main only accepts pull requests that pass.
- The pull request checklist: it's in the pull request template.

Small local models tried to re-check every rule they were given, and a
planner model mixed up the worker's rules with its own instructions.

## Decision

AGENTS.md should only contain what an agent needs to know about this
codebase. Rules belong in settings, CI checks and templates, where they're
enforced without the agent having to think about them. A rule stays in
AGENTS.md only until we find a way to enforce it there.

## Consequences

- Agents have less to read before every task.
- Before adding a rule to AGENTS.md, check whether a setting, a CI check or a
  template could handle it instead.
- Revisit if agents keep breaking one of the rules that was taken out.
