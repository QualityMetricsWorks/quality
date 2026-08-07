# Quality Summary

Portal web para captura, monitoreo y análisis de producción, scrap y PPM por planta, unidad de negocio, número de parte y catálogo de defectos.

## Objetivo

Convertir la información diaria de producción y scrap en indicadores accionables:

- Scrap general de planta.
- Scrap por número de parte.
- PPM general.
- PPM por número de parte.
- Pareto 80/20 de defectos.
- Comparación por unidad de negocio.
- Tendencia por fecha.
- Exportación de registros y resumen a Excel.

## Archivos iniciales

```text
quality_summary/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## Funcionalidades de esta primera versión

1. Catálogo de unidades de negocio.
2. Catálogo de números de parte.
3. Catálogo específico de defectos por número de parte.
4. Captura de producción y scrap por fecha, turno, unidad, NP, defecto y operación.
5. Cálculo automático de:
   - Scrap % = Scrap / Producción × 100
   - PPM = Scrap / Producción × 1,000,000
6. Dashboard con KPIs, tendencia, Pareto y resumen por NP.
7. Filtros por fecha, unidad de negocio y número de parte.
8. Exportación `.xlsx` con hojas de registros y resumen por NP.
9. Datos demo para validar rápidamente la navegación y gráficos.

## Ejecución local

Puede abrirse directamente con `index.html`, aunque se recomienda usar Live Server en VS Code.

## Publicación en GitHub Pages

1. Subir los cuatro archivos a la rama de trabajo.
2. Hacer commit y push.
3. En GitHub, abrir **Settings > Pages**.
4. Seleccionar la rama y carpeta raíz.
5. Guardar y abrir la URL publicada.

## Decisión importante sobre la base de datos

GitHub Pages solamente publica archivos estáticos. Por lo tanto, `index.html`, `styles.css` y `app.js` no pueden actuar como una base de datos central para varios usuarios.

Esta primera versión utiliza `localStorage` únicamente como almacenamiento de prototipo. Esto permite validar el flujo, pero tiene estas limitaciones:

- Los datos permanecen solamente en el navegador y equipo donde fueron capturados.
- Otro usuario no verá la misma información.
- Limpiar el navegador puede borrar los datos.
- No existen usuarios, permisos, historial confiable ni respaldo central.

Para una versión real de planta, la siguiente etapa debe sustituir esta capa por Supabase:

- PostgreSQL para catálogos y registros.
- Supabase Auth para usuarios.
- Row Level Security para permisos.
- Datos compartidos en tiempo real.
- Respaldo y trazabilidad.

La interfaz y los cálculos del dashboard no necesitan reconstruirse; solamente se reemplazan las funciones de lectura y escritura de datos.

## Modelo de datos recomendado para Supabase

### `business_units`
- `id`
- `name`
- `is_active`
- `created_at`

### `part_numbers`
- `id`
- `business_unit_id`
- `part_number`
- `description`
- `is_active`
- `created_at`

### `defect_catalog`
- `id`
- `part_number_id`
- `defect_code`
- `defect_name`
- `category`
- `is_active`
- `created_at`

### `production_records`
- `id`
- `record_date`
- `shift`
- `business_unit_id`
- `part_number_id`
- `produced_qty`
- `scrap_qty`
- `defect_id`
- `operation`
- `notes`
- `created_by`
- `created_at`

> Para un análisis más preciso, una captura con varios defectos debe evolucionar a un encabezado de producción y un detalle de scrap por defecto. Esto evita duplicar la producción cuando un mismo lote presenta más de un tipo de defecto.

## Próxima etapa sugerida

1. Confirmar la estructura visual y el flujo de captura.
2. Separar `production_records` y `scrap_details` para permitir varios defectos por corrida.
3. Crear proyecto Supabase.
4. Crear tablas y políticas de seguridad.
5. Reemplazar `localStorage` por un `dataService` conectado a Supabase.
6. Agregar acceso por roles: Administrador, Calidad, Producción y Consulta.
7. Incorporar metas de scrap/PPM y semáforos.
8. Agregar costo de scrap y análisis por operación, máquina, turno y causa.

## Librerías

- Chart.js para gráficos.
- SheetJS Community Edition para exportación Excel.

## Estado

Versión inicial de prototipo: `v0.1.0`.
