# GUVEL v1.4.8 STABLE — AUTH PRESERVING

Built directly from the known-working v1.4.7.

**Authentication, Supabase initialization, loadIdentity and loadAll are intentionally unchanged from v1.4.7.**

This release applies only low-risk DOM/UI changes:
- Today / This Week / This Month filters.
- Top 3 moved to Quality with null guard.
- General custom dashboard host removed.
- Pie/Pareto target controls removed.
- Scrap-cost input UI prepared but database writes are not enabled in this build.
- Custom dashboard scope fields prepared visually.

No SQL is required for this auth-preserving build.

If this version signs in correctly, subsequent functional changes can be layered one at a time.
