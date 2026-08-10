# GUVEL General System v1.1.2

## v1.1.2 — Users module

The user administration area is now a dedicated top-navigation module:
**Usuarios**.

It is no longer mixed with Configuración.

### Roles
- Admin — full control, including users.
- Manager — operational/master-data administration without user administration.
- Supervisor — production, quality and downtime capture.
- Guest — view and filter only.

### UX
- Compact business/industrial visual language aligned with GUVEL General System.
- Role summary cards use GUVEL brand accents.
- Dedicated user assignment card.
- Dedicated company-user table.
- Active/inactive status.
- Last access when Supabase exposes `last_sign_in_at`.
- Refresh users without reloading the whole portal.

### Supabase
v1.1.2 uses the existing v1.1.1 hotfix RPC. The supplied SQL file was updated so `admin_list_company_users()` also returns `last_sign_in_at`.

If you already ran the v1.1.1 hotfix, run the included `sql/hotfix_v1.1.1_admin_users.sql` again because the return signature was extended.

No tables are deleted or recreated.

## Upload
Replace:
- `index.html`
- `assets/`

Keep `config.js` unchanged.
