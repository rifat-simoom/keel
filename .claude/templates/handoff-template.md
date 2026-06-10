# Session Handoff — {SESSION-ID}

> Written by the agent at end-of-session. Read by the next session agent before writing any code.
> Replace all `{placeholders}`. Do not leave any section blank — write "none" if genuinely empty.

---

## What was built

{One paragraph. What files were created or modified and what they do.}

## SPEC section implemented

{Exact section name(s) from SPEC.md that this session covers.}

## Decisions made

{List any non-obvious choices. For each: what was decided and why.
Example: "Used composite index on (company_id, status) rather than two separate indexes —
query planner hits this for the most common filter combination."}

- {Decision 1}
- {Decision 2}

## Known issues / tech debt

{Anything that isn't quite right but was left because it's out of scope.
Include the FIXME tag so it can be found: # FIXME(session-id): description}

- {Issue 1}
- {none}

## What the next session must know

{Anything that would surprise the next agent if they didn't know it.
Examples: a shared model that was extended, a migration that must run first,
a package that must be rebuilt before tests will pass.}

- {Note 1}
- {none}

## FIXME count at end of session

Before: {n}  |  After: {n}  |  Delta: {+n / -n}

## Verify command

```
{exact make verify command that was run and passed}
```
