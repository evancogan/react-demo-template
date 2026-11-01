Closes #17

## What changed

Update the pull request checklist in `.github/pull_request_template.md` to specify that reasons for unticked items should be written in parentheses at the end of the line.

## Review

Tick only what you verified. If you leave an item unticked, put the reason in parentheses at the end of its line, for example (docs only).

- [ ] I read the whole diff, including new files
- [x] Only files in the issue's "Where" changed (lock file changes only if packages changed)
- [x] The summary above matches the diff
- [ ] Tests cover the change, and no test was edited just to make it pass (template file has no tests)
- [ ] `npm run check` passes locally (no tests apply to a template change)
