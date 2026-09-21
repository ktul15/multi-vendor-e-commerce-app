# Repository Guidelines

## Project Structure & Module Organization

This workspace contains the Next.js vendor dashboard. App Router pages, layouts, loading/error states, and backend-for-frontend route handlers live in `app/`; protected screens are grouped under `app/(protected)/`, while HTTP handlers use `app/api/**/route.ts`. Reusable domain, session, validation, and data-mapping logic belongs in `src/lib/`. Tests live in `test/`, with shared setup and MSW network mocks in `test/setup.ts` and `test/msw.ts`. Workspace packages such as `@repo/ui`, `@repo/auth`, and `@repo/api-client` provide shared monorepo functionality. Static assets, when needed, belong in `public/`.

## Build, Test, and Development Commands

Run commands from `apps/vendor-dashboard` unless using a root-level `pnpm --filter` command.

- `pnpm dev`: start Next.js locally on port 3001.
- `pnpm build`: create a production build.
- `pnpm start`: serve the production build on port 3001.
- `pnpm lint`: run ESLint across the workspace.
- `pnpm typecheck`: generate Next.js route types and run TypeScript without emitting files.
- `pnpm test`: run the complete Vitest suite once.
- `pnpm test:critical`: run authorization, mutation, and core workflow regression tests.
- `pnpm test:performance`: build and enforce the vendor bundle budget.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and two-space indentation. Follow existing formatting: double quotes, semicolons, and trailing commas. Name components in `PascalCase`, functions and variables in `camelCase`, and files in lowercase kebab case (for example, `product-media-manager.tsx`). Keep route handlers thin; place reusable business rules, schemas, and transformations in `src/lib/`. Before changing Next.js APIs or conventions, consult the matching guide in `node_modules/next/dist/docs/` because this project uses Next.js 16.

## Testing Guidelines

Vitest runs in jsdom with Testing Library and `@testing-library/jest-dom`. Name tests `*.test.ts` or `*.test.tsx` under `test/`. Keep tests deterministic and isolated from real networks; register browser API mocks through MSW and reset handlers between tests. Add security-sensitive or data-loss regressions to the `test:critical` script. Run targeted tests while developing, then `pnpm lint`, `pnpm typecheck`, and `pnpm test` before completion.

## Commit & Pull Request Guidelines

Use Conventional Commits such as `feat(vendor): add inventory filters`. Issue work branches from updated `dev` as `feature/<issue>-<description>`; never commit directly to `dev` or `main`. Include `Closes #<issue>` in the commit body. Pull requests should explain the change, link the issue, list verification performed, and include screenshots for visible UI changes. Keep unrelated edits out of commits and reviews; never commit `.env.local` or secrets.
