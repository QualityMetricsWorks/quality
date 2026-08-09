# GUVEL General System v1.1.0

### Corrections
- Production capture explicitly asks for the production shift. Date/time remain server-generated.
- Header and page toolbar compacted.

### Roles
- Admin: full control and users.
- Manager: master data and operational configuration; no users.
- Supervisor: production, quality/scrap and downtime capture only.
- Guest: view/filter only.

Permissions are enforced in UI and Supabase.

### Users
Create/invite the account first in Supabase Authentication, then assign it to the company and role from GUVEL Admin. No service key is exposed in the browser.

Run `sql/migrate_v1.0.4_to_v1.1.0.sql` once, then replace `index.html` and `assets/`.
