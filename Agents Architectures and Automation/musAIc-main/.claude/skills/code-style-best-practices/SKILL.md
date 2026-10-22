---
name: code-style-best-practices
description: Code-style preferences for this project's frontend and backend. Use whenever writing, editing, or reviewing TS/TSX/JS/JSX code.
---

# TypeScript and code-style best practices

Style preferences for all TypeScript/TSX and remaining JavaScript/JSX code in this project (`frontend/` and `backend/`). Apply them to new code and to any lines you touch; don't reformat unrelated code just to comply.

## Prefer TypeScript

- Use TypeScript wherever the frontend or backend tooling supports it, including configuration and Cypress support/spec files. Use `.ts` for code without JSX, `.tsx` for React components containing JSX, and `.d.ts` for declarations.
- Keep strict type checking enabled. Prefer inferred types for obvious local values and explicit types for API contracts, function boundaries, nullable state, and external data.
- Use `import type` for imports used only as types. Use `.js` extensions in backend relative imports so emitted Node ESM runs correctly; use extensionless imports with the frontend's bundler resolution.
- Avoid explicit `any`, unchecked non-null assertions, and suppressions to bypass errors. Use `unknown` and narrow it when handling errors or untrusted values. Type annotations alone do not validate external data at runtime.
- Reuse API contract types between the backend and frontend when practical; keep frontend imports of backend contracts type-only so server code is never bundled into the browser.
- Use JavaScript only when an actual tool or runtime constraint requires it. Do not introduce new JS/JSX files when TypeScript is supported.
- Run each affected package's `npm run typecheck` and `npm run build` after a migration or changes to types/configuration.

## No curly braces for single-statement bodies

When the body of an `if`, `else`, `for`, `for...of`, `for...in`, or `while` is a single statement, omit the braces. Keep it on the same line when it fits; otherwise put it on the next line, indented.

```tsx
// ✅ Preferred
if (!res.ok) throw new Error(`Request failed (${res.status})`);
if (error) return <p role="alert">{error}</p>;

for (const track of tracks) queue.add(track);

if (isLoading) return <Spinner label="Loading your library…" size="large" />;
else return <Library items={items} />;
```

```tsx
// ❌ Avoid
if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
}

for (const track of tracks) {
    queue.add(track);
}
```

Keep the braces when:

- The body has more than one statement.
- Any branch of an `if` / `else if` / `else` chain needs braces — then brace every branch of that chain for consistency.
- The body is itself a nested `if` paired with an `else` (avoids the dangling-`else` ambiguity).
- The construct requires them: function bodies (other than concise arrow functions), `try` / `catch` / `finally`, `switch`, and class bodies.

For arrow functions, prefer the concise body when the function just returns an expression:

```tsx
// ✅ Preferred
const getTitle = (track: { name: string }) => track.name;

// ❌ Avoid
const getTitle = (track: { name: string }) => {
    return track.name;
};
```
