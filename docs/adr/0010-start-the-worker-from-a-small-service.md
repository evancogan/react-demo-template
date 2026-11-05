# 10. Start the worker from a small service in the agent VM

Date: 2026-11-04
Status: Accepted

## Context

ADR 0005's loop had to run from a phone: the Planner in Open WebUI writes the
issue, the GitHub app approves it, something starts the worker, and the GitHub
app reviews and merges. Starting the worker over Remote Desktop worked but was
too clumsy on a phone. Letting Open WebUI run commands in the VM would have
given a chat model a shell. Instead, a small service in the VM offers two
fixed actions, and the work itself runs in OpenCode with a command allowlist.

## Decision

`tools/agent-worker/server.mjs` runs in the agent VM, listens only on the VM's
tailnet address behind a bearer token, and offers `start_worker` and
`worker_status` to Open WebUI's Worker preset. It refuses anything but an
open issue labeled `ready`, runs one issue at a time, and always sends
OpenCode the same prompt. It runs from `C:\Agents\worker`, outside the clone,
so an agent can't edit the service that runs it.

## Why each version changed

- **1.0** First version: start and status, the `ready` check, the fixed
  prompt. OpenCode hung waiting for input until its stdin was closed
  (`stdio: ['ignore', ...]`), and it's started as `opencode.exe` directly,
  because Windows can't spawn npm's `.cmd` wrapper without a shell.
- **1.1** Comments on the issue when a run ends, refuses if `issue-N` already
  exists on GitHub, and deletes a leftover local `issue-N`. The prompt was
  tightened after PR #61 put the line in the wrong place and failed the
  description check.
- **1.2** The 1.1 comment never arrived on #58, and nothing said why. Both
  output streams closed the log file, so whichever ended first could close it
  under the other; the pipes now use `end: false` and the report waits for
  `close`. Every report-back call prints ok or FAILED. The comment mentions
  the reviewer and the service requests a review, because GitHub Mobile only
  pushes what's addressed to you; the review request uses the REST API,
  because `gh pr edit --add-reviewer` needs `read:org`, which the agent's
  token doesn't have. The pull request is found with `gh pr list`, not by
  searching the model's log. The prompt says how to insert a line after
  another (anchor line as the old text, anchor plus new line as the new
  text), after #61 and #62 both put it before; #63 got it right.
- **1.3** The #63 run committed on the VM's `main`, so `git pull --ff-only`
  refused the next run (#64) once #63 was merged. The service now creates
  `issue-N` before OpenCode starts, and resets `main` to GitHub's, saving any
  stray commits to a `main-backup-<time>` branch. The start message no longer
  says the chat will report back, because an Open WebUI chat can't: the
  Worker model kept promising a notification that never came.

## Consequences

- From a phone, the whole loop runs without Remote Desktop, as long as the
  desktop, the VM and the service are running (PR #65).
- The service still starts by hand after a reboot. Revisit when it runs as a
  scheduled task.
- The pull request description is still the weak spot: #63 had a wrong tick
  and #65 left out reasons. The next step is a revise pass that sends the
  description check's error back to OpenCode.
- Every change to the service gets a new version number and a line here.
