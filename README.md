# GUVEL General System v1.0.0

Primera versión estable. Incluye dashboards General / Producción / Scrap / Mantenimiento, captura guiada de producción, tiempos muertos, catálogo de defectos y paros, trazabilidad, exportación desde Historial y navegación GUVEL consolidada.

## Actualización desde v0.5.0
1. Ejecutar `sql/migrate_v0.5.0_to_v1.0.0.sql` una sola vez en Supabase.
2. Reemplazar `index.html` y la carpeta `assets/` en GitHub.
3. Mantener `config.js` actual.
4. Esperar el deployment de GitHub Pages y hacer recarga forzada.

## Nota OEE
El KPI queda preparado pero muestra `—` hasta definir tiempo ciclo ideal / estándar de operación. No se fabrica un OEE artificial con datos insuficientes.
