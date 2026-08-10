# GUVEL General System v1.1.1

## Hotfix
Fixes the v1.1.0 login regression caused by the Admin Users module:
- `esc is not defined` fixed by importing `esc` from `utils.js`.
- A failure in Admin > Users can no longer block authentication or the portal shell.
- Admin Users now displays a controlled error state instead of breaking the session bootstrap.
- Includes a SQL hotfix for `admin_list_company_users()`.

## Supabase
Run only:
`sql/hotfix_v1.1.1_admin_users.sql`

Do NOT delete tables or users. Do NOT rerun the full v1.1.0 migration.

## Upload to GitHub
Replace:
- `index.html`
- `assets/`

Keep your existing `config.js`.
