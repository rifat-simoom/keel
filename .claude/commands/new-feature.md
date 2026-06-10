## /new-feature

Use this when a new capability needs to be added to the product after the initial milestones.
**Work queue: GitHub Issues.** This command ends by creating issues — nothing is written to work-queue.yaml.

---

### Step 1 — Classify the feature

Answer these questions before touching any file:

**Size:**
- Can it be done in one focused session? → **small** (single gap session)
- Does it need schema + service + API + UI? → **medium** (2–4 sessions)
- Does it change multiple services or introduce a new domain? → **large** (new milestone block)

**Type:**
- Does it change what the product *does* for the user? → update SPEC.md
- Is it purely an internal improvement (refactor, infra, performance)? → no SPEC change needed
- Does it change a business rule or compliance behaviour? → update SPEC.md + guardrails

**Urgency:**
- Customer-blocking or revenue-impacting? → use label `priority:high` when creating issues
- Standard roadmap item? → use label `priority:normal`

---

### Step 2 — Update SPEC.md (if user-facing)

Add the feature to the correct milestone in SPEC.md:
- Find the milestone it belongs to (or create a new one if it's a new domain)
- Write a "User can:" statement describing the capability
- Add any new business rules it introduces to the Business Rules section
- If it changes a locked decision, create an ADR in `/docs/ADR/` first

Do NOT add implementation details (SQL, API endpoints, code) to SPEC.md.

---

### Step 3 — Decompose and create GitHub Issues

Run `/plan-feature "{feature description}"`.

`/plan-feature` will:
1. Read the existing issue queue and gap numbers
2. Decompose into sessions (schema → service → api → ui → tests)
3. Show you a plan table and **wait for your approval**
4. Create GitHub Issues with guardrail-aware briefs and dependency links

For high-priority features, pass the urgency as context to `/plan-feature` so it sets the right labels.

---

### Step 4 — Start work

```
/orchestrate
```

The orchestrator finds the newly created issues, checks dependencies, and starts executor agents.

---

### Decision guide: when to update SPEC.md

| Situation | Update SPEC.md? |
|---|---|
| New user-facing capability | Yes — add to feature catalogue |
| New compliance rule | Yes — add to Business Rules section |
| New tech dependency | Yes — add to Tech Stack table |
| Changed locked decision | Yes — update Decisions table + create ADR |
| Bug fix (existing behaviour, wrong implementation) | No |
| Performance improvement | No |
| Refactor (same behaviour, better code) | No |
| Infrastructure change | No |
| New env var | No (goes in .env.example) |
