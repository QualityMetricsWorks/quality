# GUVEL General System v1.0.1

## New
- Cycle time configuration by **Part Number + Operation + Machine**.
- Dashboard `Scrap` renamed to **Calidad**.
- Compact dashboard filters.
- Independent **Tiempo Muerto** capture, while downtime remains available during Production capture.
- Quality dashboard: Pie + Pareto by Defect and Part Number.
- Maintenance dashboard: Pie + Pareto by Downtime Reason and Machine.
- Downtime reasons classified **Planeado / No planeado**.
- Cleaner v1.0.1 event/navigation code.

## Why cycle time is not stored only on Part Number
Low-volume/high-mix production often runs the same part on different machines with different cycle performance. GUVEL stores Ideal CT by:
`Part + Operation + Machine`.

## Before GitHub
Run once in Supabase:
`sql/migrate_v1.0.0_to_v1.0.1.sql`

Then upload:
- `index.html`
- `assets/`
- `config.js` can remain unchanged.

## OEE
v1.0.1 prepares Ideal Cycle Time and Planned/Unplanned downtime. Full OEE is intentionally not enabled until planned production time is defined consistently.
