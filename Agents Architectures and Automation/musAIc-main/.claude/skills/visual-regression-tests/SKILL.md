---
name: visual-regression-tests
description: Requires every significant visual change in the frontend to be covered by image-snapshot Cypress component tests. Use whenever adding or changing a React component, page, style, layout, markup, or visible UI state.
---

# Visual regression tests for frontend changes

Every significant visual change in `frontend/` ships with image-snapshot Cypress component tests. A change is not done until its snapshots exist, pass, and you have looked at them.

The tooling is already set up — don't reinstall or reconfigure it:

- Plugin: `@pixsame/cypress-plugin-visual-regression-diff` (registered in `frontend/cypress.config.ts` and imported in `frontend/cypress/support/component.ts`). It adds `cy.matchImage()`.
- Viewport: fixed at 1920×1080 in `cypress.config.ts`. Don't change it per test unless the test is specifically about responsive layout; then call `cy.viewport(...)` and say so in the test title.
- Specs live in `frontend/cypress/component/`, mirroring the path under `frontend/src/`: `src/components/SpotifyProfile.tsx` → `cypress/component/components/SpotifyProfile.cy.tsx`.
- Baselines are stored next to the spec in `__image_snapshots__/` and **are committed**. The plugin's `*.actual.png` and `*.diff.png` files are git-ignored.
- On CI (`CI` env var set) a missing baseline fails the test instead of being created.

Also follow the `cypress-author` skill for general Cypress test style and the `code-style-best-practices` skill for TypeScript style.

## What counts as a significant visual change

Cover it with snapshots when the change:

- adds a new component or page;
- adds a new visible state of an existing one (loading, empty, error, disabled, selected, signed-in/out, long-content, …);
- changes styles, CSS, class names that carry styles, layout, spacing, colours, typography, icons or images;
- changes rendered markup or visible text structure (new/removed/reordered elements, headings, lists, buttons).

Not significant on its own: refactors that leave the rendered output identical, changes to non-visual logic, tests, or types. These still must not break existing snapshots — if a snapshot fails, the output was _not_ identical; treat it as a visual change.

If you are unsure, add the snapshot.

## Workflow

### 1. List the affected visual states

Before writing code, list each component/page the change touches and each visual state a user can see. Every state in the list gets its own `it(...)` with a `matchImage()`. Include states the change can _indirectly_ affect (e.g. a shared component used by several pages).

### 2. Write or extend the spec

Prefer extending an existing spec for the component. Each snapshot test must be deterministic:

- **Stub all network** with `cy.intercept()` and wait on the alias. Reuse contract types from `backend/src/types/api.ts` (type-only import) for stub bodies.
- **No external or changing content**: no remote images, live dates, random values, or animations mid-flight. Pass fixed data, use `cy.clock()` for time, and point images at local fixtures (or `null`).
- **Assert the final state first**, then snapshot. `matchImage()` doesn't retry until the UI settles, so assert on the content that must be visible (`should('be.visible')`, `contain.text`, …) before calling it. Never use `cy.wait(<ms>)`.
- **Snapshot the element, not the page**: `cy.get('<component root>').matchImage()`. Use the whole document (`cy.matchImage()`) only for page-level layout.
- **Use clear titles** in the form `[state/action] → [expected result]`; the baseline file name is derived from the test title, so renaming a test creates a new baseline (delete the old one).
- **Components that need Clerk or other providers**: mount them inside the provider they need or stub the hook's module. If that's impractical, extract the visual part into a presentational component that takes props, and snapshot that. Never skip coverage silently — if something can't be snapshotted, say so in your report with the reason.

```tsx
import type { MeResponse } from "../../../../backend/src/types/api";
import SpotifyProfile from "../../../src/components/SpotifyProfile";

it("loads the profile → shows name, details and Spotify link", () => {
    cy.intercept("GET", "/api/me", { body: me satisfies MeResponse }).as("me");
    cy.mount(<SpotifyProfile />);
    cy.wait("@me");

    cy.contains("h2", "Test Listener").should("be.visible");
    cy.get('section[aria-label="Spotify profile"]').matchImage();
});
```

### 3. Generate or update baselines

Run commands in `frontend/`. Always generate baselines headless (`cypress run`), never from `cypress open`, so they match what CI renders.

- **New snapshots**: `npm run cy:run:component -- --spec <spec path>` creates the missing baselines.
- **Intended change to existing visuals**: first run without updating and confirm that _only_ the snapshots you expected fail. Then overwrite them:
  `npm run cy:update-snapshots -- --spec <spec path>`
- **Unexpected failure** in a snapshot you didn't mean to change: it's a regression. Fix the code, don't update the baseline. Open the `*.diff.png` next to the baseline to see what changed.

### 4. Review every new or changed baseline

Open each new or updated PNG in `__image_snapshots__/` with the Read tool and check it shows exactly the intended UI: right content, no loading spinner or half-rendered state, nothing cut off, no stray elements. A baseline you haven't looked at is not reviewed.

### 5. Verify and report

1. `npm run cy:run:component` passes for the whole suite (not just your spec), so you know nothing else drifted.
2. `npm run typecheck` and `npm run build` pass.
3. `git status` shows the new/updated baselines staged with the code change, and no `*.actual.png`/`*.diff.png` files.

In your final report, list each visual state covered and its baseline file, which baselines were updated and why, and anything you couldn't cover.

## Never

- Raise `maxDiffThreshold` or `diffConfig.threshold`, or add `blackout` regions just to make a failing snapshot pass. These are allowed only for genuinely non-deterministic regions, with a comment explaining why.
- Delete or overwrite a baseline to get past a failure you didn't intend.
- Run `cy:update-snapshots` on the whole suite when you meant to update one spec.
- Use `createMissingImages`/`updateImages` options inside specs, or commit `*.actual.png`/`*.diff.png` files.
- Mark a visual change complete with "tests to follow".
