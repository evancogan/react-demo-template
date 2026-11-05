# Agent worker

`server.mjs` is the small service in the agent VM that Open WebUI's Worker
preset calls. It starts OpenCode on one GitHub issue labeled `ready`, then
comments on the issue and requests a review on the pull request. It isn't part
of the app, so it moves to the workshop kit once that exists.

## What it does

- Listens only on the VM's tailnet address, port 8787, behind a bearer token.
- Offers two actions: `start_worker` (start issue N) and `worker_status`.
- Refuses to start unless the issue is open and labeled `ready`, the clone is
  clean, and no `issue-N` branch exists on GitHub.
- Resets the clone's `main` to GitHub's, saving any stray local commits to a
  `main-backup-<time>` branch, then creates `issue-N` itself, so the agent
  never works on `main`.
- Sends OpenCode the same fixed prompt every time, with a 20-minute limit.
  OpenCode only edits the files and runs `npm run check`.
- Then the service finishes the job itself: it commits the change, checks
  that only files in the issue's "Where" changed, runs `npm run check`,
  pushes, opens the pull request from the template on `main`, and requests
  your review. It ticks only what it verified (the Where check and
  `npm run check`) and gives a reason on every other item.
- If any step fails, it pushes nothing, keeps the work on the VM's local
  `issue-N` branch, and says why in a comment on the issue.

## OpenCode's permissions

OpenCode doesn't need to commit, push or open pull requests any more, so its
config (`C:\Users\agent\.config\opencode\opencode.json`) shouldn't allow
it. In `mcp.github.headers`, set `X-MCP-Tools` to `issue_read`. The `bash`
section becomes:

```json
"bash": {
  "*": "deny",
  "cd *": "allow",
  "pwd": "allow",
  "ls*": "allow",
  "head *": "allow",
  "tail *": "allow",
  "git status*": "allow",
  "git diff*": "allow",
  "git log*": "allow",
  "git branch --show-current": "allow",
  "npm ci": "allow",
  "npm run check*": "allow"
}
```

## In the VM

The service runs from `C:\Agents\worker`, not from the clone, so an agent
can't change the service that runs it. `token.txt` and `logs\` live there too
and are never committed.

To install the version on `main`, stop the service with Ctrl+C, then:

```
git -C C:\Repos\react-demo-template fetch
cmd /c "git -C C:\Repos\react-demo-template show origin/main:tools/agent-worker/server.mjs > C:\Agents\worker\server.mjs"
node C:\Agents\worker\server.mjs
```

`cmd /c` copies the file byte for byte. PowerShell's own `>` would save it as
UTF-16, which Node can't read.
