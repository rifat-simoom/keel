## /next-session

1. Read `.claude/sessions/SESSION-INDEX.md`. Find the first session marked `[ ]`.

2. Identify the **previous session** (the last `[x]` entry). If a handoff file exists at
   `.claude/sessions/{phase}/{prev-session-id}-handoff.md`, read it now.
   Summarise any gotchas or decisions the prior agent flagged that affect this session.

3. Load these files:
   - The session brief
   - `CLAUDE.md`
   - `.claude/guardrails/QUICK-REF.md`
   - `.claude/workflows/agent-loop.md`
   - Load the **full** guardrail file only if this session touches that domain:
     - Writing backend code → `.claude/guardrails/python-practices.md`
     - Writing frontend/mobile code → `.claude/guardrails/frontend-practices.md`
     - Writing auth, money, file uploads, or events → `.claude/guardrails/owasp-top10.md`
     - Writing financial calculations → `.claude/guardrails/financial-rules.md`

4. Create a new git branch:
   ```
   git checkout -b feature/phase-{n}-{session-id}
   ```
   Example: `feature/phase-8-s8.1-db-schema`
   If the branch already exists, stop and tell me — do not force-reset it.

5. **Explore before building.** Read the existing files in the area you are about to modify.
   Do not write any code yet. Specifically:
   - For backend sessions: read the existing models, repo, and router files in that service
   - For frontend sessions: read the existing components and hooks in that feature folder
   - For schema sessions: read the latest Alembic migration file to understand current DB state
   - Identify patterns already in use (base classes, fixtures, naming conventions, imports)
   - Note anything that would conflict with what the session brief asks you to build

6. Tell me:
   - Which session you are starting
   - What you will build
   - What existing patterns you found that you will follow
   - Any risk or gotcha from the prior handoff or the explore step
   - The branch name you created

7. **Wait for my confirmation before writing any code.**
