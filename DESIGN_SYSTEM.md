# Metrics Works Design System — Sprint 1 / v0.4.0

## Brand colors
The primary brand colors were sampled from the supplied Metrics Works logo:

- Metrics Works Cyan: `#0CC1E0`
- Metrics Works Red: `#FF3131`

Supporting colors are neutral and semantic only.

## Design principles
1. Business / industrial, not playful.
2. Low border radius (2–6 px).
3. White surfaces and neutral gray backgrounds.
4. Cyan represents Metrics Works identity, navigation, information and interaction.
5. Red represents Metrics Works identity plus scrap/loss/danger contexts.
6. Dense enough for manufacturing dashboards, but with consistent spacing.
7. Same components will be reusable by future Metrics Works modules.

## CSS architecture
- `tokens.css`: brand colors, typography, spacing, radii, shadows.
- `base.css`: reset and global typography.
- `layout.css`: header, content, grid and structural layout.
- `components.css`: buttons, cards, forms, tabs, tables, badges.
- `modules.css`: Scrap-specific visual components.
- `responsive.css`: responsive rules.
- `main.css`: import manifest only.

## Frozen baseline
`_frozen_v0.3.2/` is an untouched copy of the last stable Metrics Works Scrap Beta 0.3.2 and exists only as a reference/rollback point.

## Sprint 1 status
Steps 1 and 2 complete:
- Stable baseline frozen.
- Metrics Works Design System foundation created.
- No Supabase schema changes.
- No application logic changes.
