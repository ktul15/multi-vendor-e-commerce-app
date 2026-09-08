# Shared dashboard UI

`@repo/ui` provides the visual and interaction foundation shared by the vendor dashboard and admin panel. Import the global stylesheet once from each application's root layout:

```tsx
import "@repo/ui/styles.css";
```

## Tokens

The CSS custom properties in `src/tokens.css` define the supported palette, typography, spacing, radii, shadows, motion, and responsive breakpoints. Components use semantic tokens such as `--color-text`, `--color-surface`, and `--color-focus`; application code should prefer those over raw color values.

Status tones map consistently across components:

| Tone      | Representative use                     |
| --------- | -------------------------------------- |
| `neutral` | Draft or inactive records              |
| `success` | Approved, paid, or completed records   |
| `warning` | Pending or processing records          |
| `danger`  | Failed, rejected, or suspended records |
| `info`    | New or informational records           |

## Components and states

- `Button`: primary, secondary, ghost, danger, disabled, and loading states; small, medium, and large sizes.
- `Input` and `Select`: labels, hints, validation errors, required state, disabled state, refs, and native keyboard behavior.
- `Dialog`: browser-native modal focus containment, Escape dismissal, labelled title, optional description, and action footer.
- `Badge`: semantic status tones.
- `Card`: composable header, title, content, and footer regions.
- `Skeleton` and `SkeletonRegion`: reduced-motion-aware visual placeholders with an announced busy region.
- `EmptyState` and `ErrorState`: optional icon and action slots with appropriate live-region semantics for errors.

All interactive components expose visible `:focus-visible` treatment. Layouts switch from one to two columns at 48rem and can use three columns at 75rem. Animations respect `prefers-reduced-motion`.

## Representative documentation route

Run `pnpm dev` from the repository root, then open:

- Vendor: `http://localhost:3001/design-system`
- Admin: `http://localhost:3002/design-system`

These routes render buttons, badges, form validation, cards, loading placeholders, empty/error states, and an interactive modal at tablet and desktop widths.

## Dashboard shell

`DashboardShell` provides the desktop sidebar, tablet drawer, sticky header, breadcrumbs, skip link, account actions, active-route styling, and disclosure-based nested navigation. Each app supplies its own immutable `DashboardNavItem[]`, account model, current pathname, and link component, keeping vendor and admin information architecture independent. Set `navigationOnly` on a parent that groups child links without owning a route.

The shell constrains every grid child with `min-width: 0`, wraps long content, and switches to the persistent sidebar at 75rem. `DashboardLoading` and `DashboardError` provide shared route-boundary states; each application wires them through its App Router `loading.tsx` and `error.tsx` files.
