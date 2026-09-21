# Repository Guidelines

## Project Structure & Module Organization

This workspace is the Next.js admin panel (`@repo/admin-panel`). App Router pages, layouts, route handlers, and client components live in `app/`; protected views are grouped in `app/(protected)/`, and browser-facing API routes use `app/api/<resource>/route.ts`. Keep data access, formatting, state helpers, and mutation logic in `src/lib/`. Shared workspace packages are imported through `@repo/*`. Tests live in `test/`, with shared setup in `test/setup.ts` and MSW utilities in `test/msw.ts`.

## Build, Test, and Development Commands

Run commands from this directory (or use the equivalent `pnpm --filter @repo/admin-panel` command at the monorepo root):

```bash
pnpm dev           # Start Next.js on http://localhost:3002
pnpm build         # Produce the production build
pnpm start         # Serve a completed production build on port 3002
pnpm lint          # Run ESLint across the workspace
pnpm typecheck     # Generate Next types and run TypeScript checks
pnpm test          # Run all Vitest tests
pnpm test:critical # Run authorization, mutation, and key UI regression tests
```

## Coding Style & Naming Conventions

Use TypeScript and follow the existing two-space indentation, double-quoted imports, and semicolon-terminated style. Name React components in `PascalCase`; use `kebab-case.tsx` filenames in `app/` (for example, `admin-users-view.tsx`); and use descriptive `kebab-case.ts` helpers in `src/lib/` (for example, `user-list-state.ts`). Keep route handlers narrow and move reusable business or state logic into `src/lib/`. Run `pnpm lint` and `pnpm typecheck` before opening a pull request.

## Testing Guidelines

Vitest runs in jsdom with Testing Library. Add focused `*.test.ts` or `*.test.tsx` files under `test/`, mirroring the feature name. Use MSW for browser API behavior; add explicit handlers and avoid unhandled requests, real network calls, time-dependent assertions, or shared test state. Run `pnpm test:critical` for changes affecting access control, lifecycle transitions, mutations, uploads, or finance, then run the full suite.

## Commit & Pull Request Guidelines

Use Conventional Commits, such as `feat(admin): add lifecycle controls` or `fix(auth): preserve safe return path`. Include `Closes #<issue>` in the commit body for issue work. Pull requests should explain the user-visible change, link the issue, list verification commands, and include screenshots for visual changes. Keep each PR focused; do not include generated output, secrets, or unrelated refactors.
