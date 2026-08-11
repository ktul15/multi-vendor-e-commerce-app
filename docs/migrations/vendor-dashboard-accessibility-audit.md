# Vendor Dashboard Accessibility and Responsive Audit

Status: **Complete — no accessibility no-go findings**

Issue: #101

Audited target: `apps/vendor-dashboard/`

Audit date: 2026-08-11

## Scope and decision

The vendor dashboard's public authentication, lifecycle gates, dashboard, inventory, product creation, orders, earnings, and store-profile routes were audited at the supported desktop and tablet widths. The audit combines automated WCAG 2.0, 2.1, and 2.2 A/AA rules with keyboard-only workflow checks and the responsive overflow suite from issue #100.

No accessibility or responsive-layout blocker remains in this scope. Stripe Connect completion (#97) and deterministic end-to-end data setup (#117) remain separate cutover dependencies and do not change this audit result.

## Acceptance criteria

| Criterion                                                       | Result | Evidence                                                                                                                                                                  |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automated accessibility checks cover critical pages             | Passed | `vendor-accessibility.spec.ts` runs Axe on public auth, all approved-vendor critical routes, and pending, rejected, and suspended lifecycle pages.                        |
| Core workflows are keyboard operable                            | Passed | The browser suite covers sign-in, tablet navigation, account menu dismissal, category selection, product deletion, and order-action dialogs without a pointer.            |
| Focus order, dialogs, labels, contrast, and errors are reviewed | Passed | Tests verify visible focus, dialog entry/containment/restoration, accessible names, registration error association and focus, plus rendered Axe contrast and WCAG checks. |
| Tablet and desktop layouts avoid overflow and clipping          | Passed | `vendor-parity-layout.spec.ts` checks critical, detail, lifecycle, empty, and error states at 768×1024 and 1440×900.                                                      |
| Findings are fixed or tracked before cutover                    | Passed | Both audit findings were fixed and regression-tested; there are no remaining issue #101 findings requiring follow-up.                                                     |

## Findings and disposition

| Severity | Finding                                                                                                     | Disposition                                                                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Serious  | Horizontally scrollable order, product, earnings, payout, and dashboard tables were not keyboard-focusable. | Fixed by making each scroll region a labelled, focusable region. Axe now passes on every affected route.                                                    |
| High     | Reverse tabbing from the first control in a shared dialog could move focus to the document body.            | Fixed in the shared dialog primitive with forward and reverse focus wrapping. Unit and browser regressions cover containment and trigger-focus restoration. |

## Manual review notes

- The keyboard focus sequence follows the visual sequence through authentication, the responsive shell, menus, forms, and modal actions.
- Focus indicators remain visible on keyboard-reached controls at tablet width.
- Dialogs receive focus on open, contain tab focus, close with Escape, and restore focus to their trigger.
- Registration errors identify invalid controls, provide associated error text, and move focus to the first invalid field.
- Responsive tables expose labelled keyboard-focusable scroll regions instead of clipping their contents.

Automated checks reduce common WCAG regressions but are not a substitute for periodic testing with representative assistive technologies as the product evolves.

## Verification record

| Command                                                                                | Result                     |
| -------------------------------------------------------------------------------------- | -------------------------- |
| `pnpm exec playwright test e2e/vendor-accessibility.spec.ts --project vendor-chromium` | 5 tests passed             |
| `pnpm exec playwright test e2e/vendor-parity-layout.spec.ts --project vendor-chromium` | 4 tests passed             |
| Seeded `pnpm exec playwright test --project vendor-chromium`                          | 15 tests passed            |
| `pnpm --filter @repo/vendor-dashboard test`                                            | 28 files, 120 tests passed |
| `pnpm --filter @repo/ui test`                                                          | 4 files, 21 tests passed   |
| `pnpm --filter @repo/ui lint`                                                          | Passed                     |
| `pnpm --filter @repo/ui typecheck`                                                     | Passed                     |
