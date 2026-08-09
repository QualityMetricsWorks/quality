# GUVEL General System v1.0.4

## Bugfix: Production Runs
The Runs module now refreshes `production_runs` directly from Supabase every time the user opens **Corridas / Runs**.

Additional safeguards:
- Most recent run is selected automatically.
- Explicit loading state.
- Explicit zero-record state.
- Search uses Run ID, lot, customer, PN, operation, machine, operator and supervisor.
- Run detail opens automatically for the latest run.

No SQL migration is required.

## ES / EN
The previous ES/EN button pair was replaced with a subtle globe selector beside the version.

The translation engine was rebuilt as a bidirectional runtime layer:
- Navigation
- Dashboard names and descriptions
- KPI captions
- Filters
- Capture wizard
- Quality / Downtime capture
- Master data forms
- Catalogs
- Production Runs
- History
- Settings
- Login
- Placeholders and select helper text
- Dynamically rendered UI messages

Language preference remains stored locally in the browser.

## Deploy
Replace:
- `index.html`
- `assets/`

No changes to `config.js` or Supabase.
