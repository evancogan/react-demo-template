# 6. The pull request checklist is the author's self-report

Date: 2026-11-01
Status: Accepted

## Context

Agents and the human share one GitHub account, so a pull request page can't
show who ticked a box. Local models ticked items they hadn't verified, and on
PR #25 a worker replaced the template's checklist with one it made up from the
issue. Some items don't apply to every change, which led to blank boxes with
no explanation (#6, #19).

## Decision

The checklist is the author's self-report, and merging is the reviewer's
sign-off. The template says who fills it in (#24): tick only what you
verified, and put a reason in parentheses on anything left unticked. A CI
check named `description` fails when the description is missing `Closes #N`,
a heading, any of the template's checklist items, or a reason (#35). It reads
the items from the template, so there's no second copy to keep in sync.

## Consequences

- An improvised checklist or a blank unticked box fails CI before review.
- CI checks the shape, not the honesty: "(lol)" counts as a reason. Judging
  whether a tick is true stays with the reviewer.
- Editing the template changes what the check requires.
- Make `description` a required check once it has been seen failing on a bad
  description. Revisit when agents get their own GitHub account and the
  reviewer's approval can become a real GitHub review.
