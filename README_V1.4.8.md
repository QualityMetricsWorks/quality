# GUVEL General System v1.4.8

## Included
1. Dark-mode readability fix for Top 3 products with highest scrap.
2. General dashboard is now fixed to six charts: OEE, Production, Scrap, PPM, Yield and COPQ. No custom dashboards in General.
3. Top 3 products with highest scrap moved to Quality.
4. Min/max/target controls are only available for line-style KPI charts; pie and Pareto charts do not expose range/target settings.
5. Custom dashboards are scoped at creation by Customer -> Part Number -> Visualization -> Layout. Custom dashboards ignore the live dashboard period/customer/part filters and remain fixed to their saved scope.
6. Custom dashboards support edit, delete, 1/2/3-column layout and drag-and-drop ordering.
7. Downtime records can be deleted by Admin/Manager from the selected Production Run.
8. Part master now supports Piece Cost and Scrap Cost per Piece. COPQ is calculated using recoverable scrap value, with the existing piece cost used as a backward-compatible fallback until a scrap cost is configured.
9. Added Today, This Week and This Month filters.
10. General KPI cards show comparison arrows versus the immediately preceding equivalent period for supported period selections. Lower-is-better metrics (Scrap, PPM and COPQ) use inverse improvement logic.
11. Added English translations for the new UI.
12. Added dark-mode wave transition.
13. Added fluorescent red cursor point.
14. Cache-busting updated to v1.4.8.

## Supabase migration
Run `SQL_v1.4.8_scrap_cost.sql` once in Supabase SQL Editor before using Scrap Cost.

## Deployment
Replace `index.html` and the `assets/` folder. Keep the existing `config.js`.
