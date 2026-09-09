# BOH+ Product Design System

These rules apply to every new or modified page, component, modal, form, dashboard, feature, and interface in this project.

## Brand Foundation

- Treat the existing BOH+ logo and current BOH+ theme as the primary visual reference.
- Use only black, white, neutral grays, and BOH+ orange for the product UI.
- BOH+ orange is the primary interaction accent for CTAs, active states, focus states, indicators, selected controls, progress, and important highlights.
- Never introduce purple or blue as a primary UI accent.
- Never recolor, distort, stretch, or replace the BOH+ logo.

## Cohesion

- The entire application must feel like one cohesive BOH+ product.
- Before creating a component, inspect and reuse existing BOH+ components, tokens, CSS, and interaction patterns.
- Follow the existing typography, spacing, buttons, inputs, cards, tables, navigation, borders, shadows, icons, loading states, error states, success states, and responsive behavior.
- Do not introduce a new visual language, theme, primary color, component style, or page-specific design system.
- Keep new UI consistent with the existing BOH+ landing, admin, registration, and onsite check-in surfaces.

## Layout And UX

- Preserve the established responsive behavior across desktop, tablet, iPad, Android tablet, and phone.
- Avoid horizontal scrolling, clipped text, overlapping elements, and inaccessible controls.
- Prefer clear hierarchy, generous whitespace, restrained borders, subtle shadows, and intentional composition.
- Avoid excessive rounded cards, card nesting, gradients, decorative clutter, and generic SaaS dashboard patterns.
- Keep operational workflows fast to scan and touch-friendly.

## Implementation Constraints

- Preserve existing APIs, database schema, authentication, registration logic, QR generation/scanning, attendance logic, and working functionality unless the user explicitly requests a behavior change.
- Use shared design tokens and styles instead of duplicating page-level values.
- Validate new UI at mobile and desktop widths before finishing.
- Run the relevant regression tests after changes.
