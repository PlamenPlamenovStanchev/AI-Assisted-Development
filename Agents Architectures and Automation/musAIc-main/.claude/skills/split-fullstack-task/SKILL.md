---
name: split-fullstack-task
description: Delegates a full-stack task to two sub-agents, one for the backend and one for the frontend, after defining their shared API contract. Use when implementing a complex feature that requires changes in both the backend and the frontend, or when the user invokes /split-fullstack-task.
---

# Split a full-stack task between backend and frontend sub-agents

The task is the one the user described in their message.

You are the **main agent**. You plan, define the shared contract, delegate, and integrate. Two sub-agents implement:

- **Backend agent** — owns `backend/` (Express API, TypeScript, Node ESM).
- **Frontend agent** — owns `frontend/` (React SPA, Vite, TypeScript, Cypress).

Sub-agents cannot talk to each other. Everything they must agree on goes through you, and you state it **before** either agent starts.

## 1. Understand the task yourself

Read the code the task touches before planning. Don't delegate exploration — the split and the contract depend on what you learn.

- Start from `backend/src/routes/api.ts`, `backend/src/types/api.ts` (the shared API contract types), and the frontend components/pages that consume the API.
- If the task is ambiguous and the ambiguity changes the API or the UX, ask the user now, before writing the plan.
- If one side needs no changes, say so and do that part yourself or with a single agent. Don't spawn an agent with nothing to do.

## 2. Write the split plan

Post the plan in chat with exactly these three sections. Keep it concrete — file paths, endpoint paths, type names.

```markdown
## Split plan: <task>

### Part 1 — Backend (`backend/`)
- Goal: …
- Changes: <routes / services / middleware / types, with file paths>
- Done when: <observable behaviour + `npm run typecheck` and `npm run build` pass>

### Part 2 — Frontend (`frontend/`)
- Goal: …
- Changes: <pages / components / hooks / tests, with file paths>
- Done when: <observable behaviour + `npm run typecheck` and `npm run build` pass>

### Synchronization
<every point below, or the explicit "none needed" statement>
```

### The Synchronization section

This section is mandatory. List every decision both parts depend on, each fully specified:

1. **API contract** — for each new or changed endpoint:
   - Method and path, e.g. `GET /api/top-tracks`
   - Auth: whether `requireUser` applies and what an unauthenticated call returns
   - Request: path params, query params (names, types, allowed ranges, defaults), JSON body type
   - Success response: status code and the TypeScript type name in `backend/src/types/api.ts`
   - Error responses: each status code, when it occurs, and its body (`ApiError` unless stated otherwise)
2. **Approach decisions** — anything else both sides must agree on: pagination or caching strategy, how loading/empty/error states map to response codes, naming, new environment variables, new dependencies, changes to Vite proxy or CORS.
3. **Ordering** — if one part can't be verified until the other exists, say how each agent proceeds meanwhile (for example, the frontend codes against the contract types and verifies with typecheck/build only).

If the parts are truly independent, write it explicitly, with the reason:

> Synchronization: none needed — <reason, e.g. "the backend change is internal to the Spotify service; the response shape of `GET /api/me` is unchanged">.

If a synchronization point is a product or design choice the user should make, ask before delegating. Otherwise choose sensibly, state your choice in the plan, and continue.

## 3. Write the contract into code before delegating

Put the new or changed request/response types in `backend/src/types/api.ts` yourself, before spawning the agents. This file is the single source of truth:

- The backend uses the types with `satisfies` on response bodies, as the existing routes do.
- The frontend imports them **type-only** (`import type { … } from '../../../backend/src/types/api'`) so no server code is bundled.
- Neither sub-agent edits `backend/src/types/api.ts`. If one finds the contract wrong or insufficient, it stops and reports back (see step 5).

Follow the `code-style-best-practices` skill when writing the types.

## 4. Spawn both agents in parallel

Call the Agent tool twice **in the same message** (`subagent_type: "general-purpose"`), so both parts run concurrently. They edit disjoint directories in the same working tree, so don't use worktree isolation.

Each prompt must stand alone — the sub-agent has none of this conversation. Use this template, filling in one part:

```text
You are implementing the <BACKEND | FRONTEND> part of a full-stack task in the musAIc repository
(<absolute repo path>). Another agent is implementing the <other> part at the same time.

## Overall task
<one-paragraph summary of the whole feature, so you understand the context>

## Your part
<the Part 1 or Part 2 section of the split plan, verbatim>

## Synchronization (fixed — do not deviate)
<the Synchronization section of the split plan, verbatim>
The contract types are already in backend/src/types/api.ts: <type names>.

## Boundaries
- Edit only files under <backend/ | frontend/>. Do not touch the other package, the repository root,
  or backend/src/types/api.ts.
- If the contract or an approach decision above is wrong, ambiguous, or blocks you, STOP and report:
  what you need changed and why. Do not work around it or invent your own contract.
- Don't commit, push, or install packages that the plan doesn't list.

## Conventions
- Read and follow .claude/skills/code-style-best-practices/SKILL.md.
- <Frontend only: if the plan includes tests, follow .claude/skills/cypress-author/SKILL.md.>

## Verify
Run `npm run typecheck` and `npm run build` in <backend/ | frontend/> and fix every error.

## Report back
1. Files changed, one line each on what changed.
2. Verification results (paste failures, if any remain).
3. Deviations from the plan or contract issues — "none" if none.
```

## 5. Act as the hub while they work

You'll be notified as each agent finishes. If an agent reports a contract or approach problem:

1. Decide the change (ask the user if it's a product decision).
2. Update `backend/src/types/api.ts` and restate the changed synchronization point in chat.
3. Send the change to **both** agents with SendMessage — the one that raised it and the other one, which may already depend on the old version. If an agent has already finished, continue it with SendMessage rather than spawning a fresh one.

Never let one agent's local workaround silently change what the other agent relies on.

## 6. Integrate and verify

After both agents finish:

1. Review the combined diff (`git diff`) against the plan: every endpoint matches the contract (path, params, status codes, body types), and the frontend handles each documented error status.
2. Run `npm run typecheck` and `npm run build` in both `backend/` and `frontend/`.
3. Fix small integration gaps yourself. For larger ones, continue the relevant agent with SendMessage and the exact problem.
4. When the change is user-visible and the environment allows it, run both apps and exercise the feature (see the `run` skill).

Then report to the user: what each part changed, the final contract, any deviations from the plan, and verification results — including anything you couldn't verify.
