# Metrics Works Scrap v0.4.0 — Sprint 1 / Step 3

## Application Shell completed
- Two-level Metrics Works shell:
  - Product bar: Metrics Works brand, Scrap module, company/user context.
  - Operational navigation bar: Dashboard, Captura, Clientes, NP, Máquinas, Catálogo, Historial.
- SVG navigation icons.
- Responsive shell for laptop/tablet/mobile.
- Page toolbar standardized.
- Export action emphasized as primary action.
- Synchronization status moved into the navigation shell.

## Chart identity
Legacy dark-blue/orange Chart.js colors were removed.
- Scrap: Metrics Works Red `#FF3131`
- PPM: Metrics Works Red `#FF3131`
- COPQ: Metrics Works Red `#FF3131`
- Yield: Metrics Works Cyan `#0CC1E0`
- Pareto bars: Metrics Works Red
- Pareto cumulative line: Metrics Works Cyan

Yield remains fixed to the 50–100% range.

## Backend
No Supabase migration is required.
No tables or RLS policies were changed.
