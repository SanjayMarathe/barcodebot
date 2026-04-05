# Issues Guide

Use this guide to raise clear, actionable issues for this repository.

## When to Raise an Issue

Open an issue if you find:

- A bug in behavior
- Runtime or setup errors
- Wrong file/folder path in docs or code
- Incorrect code logic or broken example flow
- Missing or outdated instructions

## Before You Open an Issue

1. Search existing issues to avoid duplicates.
2. Test with the latest `main` branch.
3. Collect logs, traceback, and reproduction steps.

## Issue Types

- **Bug Report**: Something is broken or not working as expected.
- **Error Report**: Runtime/import/install error with logs.
- **Wrong Path Report**: Incorrect file path, import path, or docs path.
- **Code Issue Report**: Wrong logic, incorrect implementation, or bad output.

## What to Include

- Clear title
- Expected behavior
- Actual behavior
- Exact steps to reproduce
- File path(s) affected
- Error message / stack trace
- Environment details (OS, Python version)
- Screenshots (if useful)

## Fast Issue Creation (CLI)

```bash
gh issue create --title "Bug: short title" --body "Steps, expected, actual, logs"
```

## Useful Links

- Contributing guide: `CONTRIBUTING.md`
- Agent README template: `docs/AGENT_README_TEMPLATE.md`
