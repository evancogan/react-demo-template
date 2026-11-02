# Small-model comparison, November 2026

Date: 2026-11-02
Status: Planned. Results will be added in a later pull request.

## Why

Every agent run on the 8 GB GPU so far used one model, `qwen3.5-9b-text`.
Public benchmarks say little about models this small working as agents, so
this comparison gives several small models the same tasks, in the same setup,
and logs each run in `runs.csv`.

## Setup, the same for every run

- The agent's VM, a Bionic project in coding mode with Manual Review, and the
  repo at `C:\Repos\react-demo-template`.
- Models served from the desktop over LM Link, fully on the GPU.
- Context 32K, K and V cache `q8_0`, 1 parallel slot, flash attention on. A
  model that doesn't fit at 32K runs at 16K, and `settings` in `runs.csv` says
  so.
- LM Studio's log captures every prompt and response, and runs are scored from
  the log, not from the agent's own report.

## Candidates

| Model              | Sampling                                     | Notes                                 |
| ------------------ | -------------------------------------------- | ------------------------------------- |
| `qwen3.5-9b-text`  | temp 0.6, top_p 0.95, top_k 20, presence 1.5 | Baseline, thinking on                 |
| `qwen2.5-coder-7b` | temp 0.7, top_p 0.8, top_k 20, repeat 1.1    | Coding specialist from 2024           |
| `granite-4.2-8b`   | temp 1.0, top_p 0.95                         | Thinking on by default, 16K context   |
| `gemma-4-e4b`      | temp 1.0, top_p 0.95, top_k 64               | May need 16K context                  |
| `lfm3-1.7b`        | temp 0.1, top_k 50, repeat 1.1               | Tiny, but strong at single tool calls |

Sampling follows each model's own recommended settings, so only the context,
cache and slots are the same for all of them.

## Tasks

The goal for both tasks: the README's Status section still says the app
skeleton, CI and agent workflow files "come next", which is no longer true.

1. **Planner (write-spec).** Each model gets the same prompt and writes one
   issue: "Write one issue for this repo, using its Task template, for this
   goal: update the README's Status section so it describes where the repo is
   now. Then stop." The prompt doesn't mention labels, so a `proposed` label
   shows the model followed AGENTS.md. Issues that aren't used are closed with
   a note.
2. **Worker (mechanical-edit).** One approved issue for the same goal, worked by
   every model on its own branch, with the same prompt: "Work on issue #N in
   evancogan/react-demo-template." The best pull request is merged, and the
   others are closed with a note.

## Scoring

Planner, one point each:

- Uses the Task template's headings: What, Where, Done when, Constraints.
- Writes the exact new text out in Constraints.
- Says exactly where in the file the change goes.
- Lists only Done when items that can be checked from the diff or the pull
  request, including "CI passes".
- Labels the issue `proposed`.

Worker:

- `done_when_score` against the issue's Done when items.
- Finished with a pull request without a nudge: yes or no.
- The pull request passed the `description` check the first time: yes or no.
- Its report matched the log: yes or no.
- Turns, minutes and tokens per second, from the log.

## Predictions

Recorded on 2026-11-02, before any comparison run.

**Evan:** "An older model like qwen 2.5-coder:7b will be more efficient on
consumer hardware, as well as providing more on-spec issue creations and PR's
from my template"

**Alternative hypothesis:** `qwen2.5-coder-7b` writes the cleanest edit but has
the most trouble with the tool loop (writing tool calls as text, or not
finishing with a pull request), while `qwen3.5-9b-text` finishes most reliably.

## Results

To be added after the runs.
