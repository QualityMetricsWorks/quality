# GUVEL General System v1.0.2

## OEE activated
GUVEL now calculates:
- Availability
- Performance
- Quality
- OEE

### Planned Production Time
For each unique `Machine + Date + Shift` represented in the filtered production:
`Shift duration - configured breaks - Planned downtime events`.

### Availability
`(Planned Production Time - Unplanned Downtime) / Planned Production Time`

### Performance
`Σ(Ideal Cycle Time × Total Pieces) / Operating Time`

### Quality
`Good Pieces / Total Pieces`

### OEE
`Availability × Performance × Quality`

Performance and the other components are capped at 100% for dashboard display.

## Shift Configuration
Admin users now have **Configuración** where they can define:
- Shift code/name
- Start time
- End time
- Planned break/excluded minutes

## Downtime capture
Every downtime event can explicitly be marked:
- `Planned` — excluded from planned production time, does not penalize Availability.
- `Unplanned` — reduces operating time and Availability.

The selected downtime catalog reason still provides a default classification, but the event can be overridden at capture.

## Before GitHub
Run once:
`sql/migrate_v1.0.1_to_v1.0.2.sql`

Then upload:
- `index.html`
- `assets/`

No config.js change required.
