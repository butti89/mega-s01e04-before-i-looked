# 0005 · What every issue carries

- Status: accepted · 2026-11-02 · decided by the lane owner (butti89)
- Amends: 0002 (work is issues)

## Context

The skill `plan-to-issues` asks the human what every issue must carry, unless the repo already
says it. A worker starts cold in its own worktree and reads only its issue and AGENTS.md, so
whatever the issue leaves out, the worker guesses. Parallel workers guess differently: two
workers on the same plan each wrote their own date check in the same file.

## Decision

Every issue split from a plan carries, in this order:

1. First line `Source: plan.md § <n>`; label `plan:<plan name>`.
2. `## Scope`: the boundary and the starting point, plus any decision the human made for this
   issue, written in. A decision made in chat and not written here doesn't exist for the worker.
3. `## Out of scope`: only nearby work another issue owns, or that a worker could do by mistake.
4. `## Done when`: one checkable condition. When it waits on someone outside the repo (a
   reviewer, another team), it says so, and the issue closes on their answer, not on the send.
5. `## Blocked by`: issue numbers, or `—`.
6. `## Worker notes`, exactly:

   ```md
   - Read AGENTS.md first (vision and styleguide are linked there).
   - Work on branch `issue-<n>`, in your own worktree.
   - Close with the closing comment from AGENTS.md. If "Done when" can't hold yet, leave the issue open and say what it waits on.
   ```

Anything two parallel issues must agree on (a file path, a sort order, a count) is decided once:
in one issue's scope, or in a coordinator comment on each issue that needs it.

## Consequences

- `plan-to-issues` finds this file at its step 4 and does not ask again. A new shape is a change
  to this ADR, made by the lane owner.
- Issues run to about 200–350 words. Longer means the plan section needs another split.
