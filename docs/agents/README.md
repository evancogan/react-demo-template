# Agent run log

`runs.csv` has one row per agent run. It's used to choose which model handles
which kind of task. Only fill in values that were measured; leave the rest
empty.

- `date`: the day of the run, as YYYY-MM-DD.
- `issue`: the issue the agent worked on.
- `pr`: the pull request the run produced, or empty if there was none.
- `task_class`: the kind of task, such as `mechanical-edit` or `address-review`.
- `model`: the model that did the work.
- `settings`: sampling, context and hardware settings, separated by semicolons.
- `done_when_score`: how many of the issue's Done when items were met, such as
  `3/4`.
- `turns`: how many responses the model produced.
- `minutes`: how long the run took, from the first prompt to the final answer.
- `loops`: `yes` if the model repeated a step without making progress,
  otherwise `no`.
- `outcome`: the final verdict: `merged`, `merged-after-fixes`, `closed` or
  `stopped`.

Agent runs from the phone use Open WebUI: the Planner writes issues and the Worker starts the coding agent in the agent VM.
