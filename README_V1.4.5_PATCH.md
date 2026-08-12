# GUVEL General System v1.4.5

## Production capture — manual production date
- Production date is now required during guided production capture.
- The application no longer derives `run_date` from the current day.
- This prevents a production recorded after midnight/network delay from being assigned to the wrong production day.
- `created_at` and `completed_at` remain system timestamps for technical/audit traceability.
- Shift remains explicitly selected by the user.

## Inline Quality / Scrap
- The separate Quality/Scrap capture module remains available.
- Production preview now includes an optional Quality/Scrap section.
- Multiple defect events can be added in the same production capture.
- Each event supports defect, quantity, disposition, additional cost and reason/notes.
- Cumulative inline scrap cannot exceed the production quantity.
- Inline scrap is persisted against the newly created production run.

## Supabase
This release DOES require one SQL patch:
`sql/v1.4.5_manual_production_date.sql`

Run that SQL once in Supabase SQL Editor before using production capture.

No changes to `config.js` are required.
