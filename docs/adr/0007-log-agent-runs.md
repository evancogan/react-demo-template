# 7. Log every agent run to choose models

Date: 2026-11-01
Status: Accepted

## Context

Different local models suit different tasks, and impressions were unreliable.
On issue #17 the 9B looked slow, and the first guess was that reading the
files was the problem; measuring showed it was partly running on the CPU.
The same issue showed the 35B scoring 4/4 where the 9B scored 1/4. The
text-only 9B fit fully on the GPU at 30 to 48 tokens a second, but used the
wrong tools and reported fixes it hadn't made (#24).

## Decision

Log one row per agent run in `docs/agents/runs.csv` (#21): issue, pull
request, task class, model, settings, Done when score, turns, minutes, loops
and outcome. Only fill in measured values and leave the rest blank. The
outcome is the final verdict (`merged`, `merged-after-fixes`, `closed` or
`stopped`), never a status that goes stale, like "open" (#25).

## Consequences

- Choosing a model for a task class can be based on scores instead of
  impressions.
- A row is only as good as its measurements: start the log capture before
  each run, and restart it after LM Studio restarts.
- Plain CSV opens in Excel and diffs line by line.
- Once each task class has several runs, write a routing table from it.
