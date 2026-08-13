# GUVEL General System v1.4.6 — Product Polish

## Included
1. Compact / controlled shift configuration layout to prevent overflow.
2. Dashboard range controls: minimum, maximum and target line via the gear on each dashboard.
3. Dark-mode hover/readability fixes for Runs, Defects and Users role cards.
4. Printable Production Run detail: A4-friendly print layout with KPIs, traceability and run information.
5. Personnel editing without changing the personnel record ID.
6. Additional dashboard views per Production, Quality and Maintenance, selectable from a compact dropdown. Views are stored locally per browser and use the active dashboard filters.
7. Visual/product polish CSS.

## Data / Supabase
No SQL migration is required for v1.4.6.
The dashboard range/custom-view preferences are currently browser-local (`localStorage`) so they cannot alter company data.

## Deployment
Replace `index.html` and `assets/`.
Keep the existing `config.js`.
