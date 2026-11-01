# 3. AGENTS.md holds only rules about actions

Date: 2026-11-01
Status: Accepted

## Context

AGENTS.md is read into every agent's context. It had grown to mix two kinds of
rules: rules about actions (never merge, stay inside Where, don't edit tests)
and rules about output that something else already enforces (Prettier style
and LF endings are checked by CI, and the pull request checklist lives in the
PR template). Small local models spent effort re-checking every rule they were
shown, and a planner given the full list confused the worker's rules with its
own.

A rule can be enforced at several levels, strongest first: permissions (the
token can't do it), automated checks (CI fails it), templates (the structure
leads the right way), rules in context (the model has to remember), and human
review.

## Decision

AGENTS.md keeps only rules that nothing stronger can enforce: mostly actions
that can't be seen or undone after the fact, such as merging. Output rules
live in CI and the templates. One rule points agents at the PR template, since
GitHub doesn't apply it when a pull request is opened through the API.

## Consequences

- Less context for every agent, and fewer rules to re-check.
- A new rule belongs in AGENTS.md only if no permission, check or template can
  enforce it.
- Revisit if an output rule keeps being broken despite its check, or if a new
  tool can enforce one of the action rules (for example, a token that can't
  merge).
