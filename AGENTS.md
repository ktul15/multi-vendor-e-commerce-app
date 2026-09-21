# AGENTS.md

## Repository

Monorepo applications:

- `backend/`: Express 5 + TypeScript, Prisma/PostgreSQL, Redis, Stripe, Firebase, and Zod.
- `storefront/`: Flutter customer app.
- `vendor_dashboard/`: Flutter vendor app.
- `admin_panel/`: Flutter admin app.
- `apps/vendor-dashboard/`: Next.js vendor dashboard.
- `apps/admin-panel/`: Next.js admin panel.

Backend features use `backend/src/modules/<feature>/` with routes, controller, service, and validation files. Keep controllers thin, business logic in services, and request validation in Zod.

Flutter apps use BLoC/Cubit. Source belongs in `lib/`, tests in `test/`, and filenames use `snake_case.dart`.

## Verification

Run commands from the relevant application directory.

Backend:

```bash
npm run format:check
npm run lint
npm run build
npm test
```

Flutter:

```bash
dart format .
flutter analyze
flutter test
```

Run the smallest relevant checks during development and all affected checks before completion.

## Safety and Scope

- Do not commit secrets or `.env` files.
- Preserve unrelated user changes.
- Keep unrelated files out of reviews, staging, commits, and merges.
- Do not merge, push, or close an issue until its acceptance criteria and required tests pass.

## Required Issue Workflow

Branch hierarchy: `feature/*` → `dev` → `main`.

For every issue:

1. Start from updated `dev`.
2. Create `feature/<issue-number>-<short-description>`.
3. Add the issue to GitHub Project #2 if absent and move it to **In Progress** using the project-status script below.
4. Implement and verify the acceptance criteria.
5. Complete the pre-commit review below.
6. Commit using Conventional Commits and include `Closes #<issue-number>` in the body.
7. Merge into `dev` with `--no-ff`, then push `dev`.
8. Close the issue and move its project card to **Done** using the project-status script below.
9. Update `main` only by merging `dev`.

Never commit directly to `dev` or `main`.

### Pre-commit Review

Before every issue commit:

1. Stage only issue-related files.
2. Run `senior-code-reviewer` once against `git diff --cached`.
3. The reviewer must report only actionable findings, ordered by severity, with a short description and `file:line`. It must omit praise and general summaries.
4. If findings exist, list them once and ask the user which to fix.
5. If there are no findings, state that briefly and continue.
6. Rerun the review only if the staged diff changes afterward.

Never review, stage, commit, or merge unrelated user changes.

## GitHub Project Status

For issue work:

- Before implementation, run `scripts/set-issue-project-status.sh <issue> in-progress`.
- After merging and closing the issue, run `scripts/set-issue-project-status.sh <issue> done`.

Obtain the appropriate approval before external GitHub writes. Keep branch creation, merging, pushing, issue closing, and project updates as explicit steps; do not combine them into an unreviewed script.

### Completion Summary

After merging into `dev`, pushing, closing the issue, and moving its project card to Done, provide a summary of at most 300 words containing:

- Why
- What
- How
- Modified files, grouping related files where appropriate
- Verification commands and results

Do not repeat branch, commit, issue, or test information across sections.

If listing every file is important, keep the list but make each explanation one short sentence.
