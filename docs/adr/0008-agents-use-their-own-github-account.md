# 8. Agents work through their own GitHub account

Date: 2026-11-01
Status: Accepted

## Context

Agents used tokens that acted as the repo owner's GitHub account. GitHub
couldn't tell an agent from a human: review threads read like one person
arguing with themselves, and no approval could be required, because nobody
can approve their own pull request. "Never merge" could only be a rule in
AGENTS.md (ADR 0005).

GitHub's terms allow one free machine account per person, set up and owned by
a human who is responsible for its actions. Fine-grained tokens don't work for
a collaborator on someone else's personal repo, so its token has to be a
classic one.

## Decision

Agents work through `evancogan-agent`, a machine account with write access,
using a classic token with only the `public_repo` scope, one token per
machine. "Protect main" requires one approval, approval of the most recent
push and dismissal of stale approvals. Repository admins can bypass it for
pull requests only.

## Consequences

- GitHub records who did what. On the first test, issue #42 and pull request
  #43 show `evancogan-agent` as author, and its commit uses the account's
  noreply address. The agent first tried to write straight to `main`, and the
  ruleset refused it (409).
- An agent's pull request can't merge before a human approves it. After
  approval, write access could still merge, so the never-merge rule stays in
  AGENTS.md until a GitHub organization can restrict who merges.
- Without the `workflow` scope the token can't change CI, and it can't reach
  private repos. Private client forks will need a separate token.
- Only actions through the GitHub tools run as the agent. A shell on the
  owner's machine still has the owner's git and `gh` login, so agents run
  without a project folder until they have their own clone and credentials.
  In that mode Bionic doesn't pass file contents to the model, so agents can't
  read the templates or AGENTS.md (#42, #43).
- Revisit before the tokens expire (2027-01-31), or when moving the repos into
  a GitHub organization.
