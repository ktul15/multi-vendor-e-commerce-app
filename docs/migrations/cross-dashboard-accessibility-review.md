# Cross-dashboard accessibility review

Reviewed for issue #119 on 2026-08-18. The scope covers the critical vendor and admin Next.js routes, shared dashboard navigation and dialogs, forms, tables, charts, statuses, and responsive keyboard workflows.

## Review matrix

| Area                         | Result | Evidence and remediation                                                                                                                                                                                                                                         |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automated checks             | Pass   | Axe runs WCAG 2.0 A/AA, 2.1 A/AA, and 2.2 AA rules against vendor authentication, lifecycle, and six operational routes plus admin authentication and eleven operational/editor routes. The complete seeded Playwright suite runs in CI.                         |
| Keyboard operation           | Pass   | Browser tests cover sign-in, visible focus, responsive navigation, account menus, table regions, comboboxes, confirmation dialogs, focus traps, Escape dismissal, and trigger focus restoration.                                                                 |
| Focus, labels, and headings  | Pass   | Critical pages expose one visible level-one heading. Invalid authentication fields receive focus and use `aria-invalid` plus linked error descriptions. Shared inputs, selects, dialogs, breadcrumbs, skip links, and table captions provide programmatic names. |
| Route announcements          | Fixed  | Root metadata now uses title templates and every reviewed route provides a descriptive page title, allowing the Next.js route announcer to distinguish client-side transitions.                                                                                  |
| Contrast                     | Fixed  | Axe found a finance selector that recolored the enabled commission button label to muted gray on purple. The selector is now limited to the rate summary, preserving the button's accessible foreground color.                                                   |
| Errors and status updates    | Pass   | Forms and mutations expose alerts; loading, result counts, partial-data notices, pagination, and successful updates use status or polite live regions where appropriate.                                                                                         |
| Charts and status colors     | Pass   | Revenue charts have named image semantics, descriptions, point labels, and visually hidden data lists. Badges always include status text, so meaning is not conveyed by color alone.                                                                             |
| Motion and responsive layout | Pass   | Shared animations honor `prefers-reduced-motion`; keyboard checks run at a tablet viewport and validate the modal navigation drawer.                                                                                                                             |

## Automated coverage

- `e2e/vendor-accessibility.spec.ts`: vendor Axe scans, lifecycle states, keyboard workflows, dialogs, category selection, and validation focus.
- `e2e/admin-accessibility.spec.ts`: admin Axe scans, descriptive titles, keyboard workflows, table navigation, dialogs, validation focus, and chart/status alternatives.
- `e2e/accessibility-helpers.ts`: shared Axe reporting and keyboard traversal utilities.

Automated checks cannot prove every assistive-technology experience. Screen-reader usability should remain part of release acceptance testing, while these suites prevent the blocking findings identified in this review from regressing.
