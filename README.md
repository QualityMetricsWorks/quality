# GUVEL General System v1.4.0

## Project stage
v1.4.0 separates operational data from the audit trail.

### Navigation
- Dashboard
- Captura
- Clientes
- Números de Parte
- Máquinas
- Personal
- Catálogo
- Corridas
- Datos
- Historial (Admin / Manager)
- Usuarios (Admin)
- Configuración

## Datos
The previous **Historial** module is now **Datos**.
It contains captured information for:
- Producción
- Calidad / Scrap
- Mantenimiento / Tiempos Muertos

The Excel export button is available only inside Datos.

## Historial
The new **Historial** module is the system audit trail.

It shows:
- Who performed the action
- Email
- Date / time
- Action: Creation / Modification / Deletion
- Module/table
- Record ID
- Before / After JSON detail

Access:
- Admin: yes
- Manager: yes
- Supervisor: no
- Guest: no

## Audit architecture
The audit trail is generated at the database level using PostgreSQL triggers. This is intentional: hiding UI buttons is not enough for traceability.

Tracked operational tables:
- clients
- part_numbers
- operations
- defects
- machines
- part_machines
- personnel
- downtime_reasons
- downtime_events
- part_cycle_times
- shift_schedules
- production_runs
- scrap_events
- profiles

## Supabase migration
Run once:

`sql/migrate_v1.1.2_to_v1.4.0_audit.sql`

Do not delete existing tables or data. The migration is additive and creates:
- audit_logs
- guvel_audit_trigger()
- list_company_audit_logs()

## Deploy
After the SQL succeeds, replace:
- index.html
- assets/

Keep:
- config.js

Then hard refresh with Ctrl + F5.
