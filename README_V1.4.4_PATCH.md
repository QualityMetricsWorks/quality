# GUVEL General System v1.4.4

## 1. Language — Users module
- The Users navigation item now has an explicit i18n key.
- The page title uses the active language directly through `tr()`.
- Switching between ES/EN now translates both the navigation module title and the breadcrumb/page title.
- Added translations for personnel search placeholders and no-match state.

## 2. Production personnel search
The production capture Step 5 now uses searchable personnel pickers instead of native selects.

### Supervisor / Operator
- Search by employee number or name.
- Filter results while typing.
- Dropdown shows matching personnel.
- Displays full name and employee number.
- Stores the personnel UUID internally, so the existing production registration flow is unchanged.
- Supports catalogs with hundreds of employees without scrolling through a 200-person select list.
- Keeps role filtering: supervisors only appear in Supervisor; operators only appear in Operator; `both` can appear in either.

## Supabase
No SQL migration is required. Existing database and `config.js` remain compatible.
