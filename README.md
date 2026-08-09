# GUVEL General System v1.0.3

## ES / EN
A language selector is now displayed beside the version:
`ES | EN`.

The selected language is persisted in browser storage and restored on the next visit. The translation layer is centralized in:
`assets/js/i18n.js`.

This avoids maintaining separate HTML pages for Spanish and English.

## Production Runs
New **Corridas / Runs** module.

A Production Run is not a new duplicate record. It is the traceability view built from the existing:
- production_runs
- scrap_events
- downtime_events
- personnel
- part_cycle_times
- machines
- operations

Each run shows:
- Run identifier (`PR-XXXXXXXX`)
- Lot
- Customer / Part Number
- Operation / Machine / Ideal CT
- Operator / Supervisor
- Recorded / Completed timestamp
- Production
- Scrap
- Yield
- PPM
- COPQ
- Downtime
- Quality events
- Downtime events

## Supabase
No SQL migration is required for v1.0.3.

Upload:
- index.html
- assets/

config.js remains unchanged.
