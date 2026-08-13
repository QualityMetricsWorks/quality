# GUVEL General System v1.4.7

## Dashboard workspace
- Removed page-level dashboard gear.
- Added independent configuration gear to each dashboard chart.
- Each chart can keep its own minimum, maximum and target.
- Added custom dashboard creation/edit/delete without browser prompts.
- Added dashboard type selector instead of site notification/prompt.
- Added 1 / 2 / 3 column layout controls.
- Added drag-and-drop reordering for custom dashboards.
- Dashboard layout, names, chart type and objectives remain browser-local in this version.
- No Supabase SQL migration is required.

## Deployment
Replace `index.html` and `assets/`; keep the existing `config.js`.
