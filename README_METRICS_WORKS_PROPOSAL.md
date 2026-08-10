# Metrics Works General System — Proposal v1.4.1

## Purpose
This is an isolated presentation variant prepared only for proposal/demo purposes.

It is NOT the GUVEL visual baseline and should NOT be used as a reference for future GUVEL development.

## Identity
- Orange: #EC6B1E
- Blue: #143980
- Green: #006732
- Logo: Metrics Works

## Visual direction
This proposal intentionally differs from GUVEL:
- vertical industrial navigation
- darker navy shell
- more squared enterprise components
- orange active-state accent
- blue structural accents
- green operational/status accents
- higher-density business workspace
- restrained shadows
- less rounded geometry

## Important
After this proposal, return to the GUVEL General System v1.4.1 baseline for future GUVEL work.


## v1.4.1 Login Hotfix
The proposal uses the same Supabase project/profile as the working General System, but the login flow is now isolated from secondary data-loading failures.

Authentication success is no longer blocked by a failure in a non-authentication table.
Login errors are shown directly in the login form.

No SQL migration is required.
