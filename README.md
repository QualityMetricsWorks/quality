# Quality Summary — Beta 0.1

Portal industrial para monitoreo de producción, scrap, PPM y análisis Pareto 80/20.

## Beta 0.1

- Dashboard general con producción, scrap %, PPM y principal defecto.
- Filtros por fecha, unidad de negocio y número de parte.
- Captura de producción y scrap con validaciones.
- Catálogos de unidades de negocio, números de parte y defectos por NP.
- Pareto gráfico y tabla 80/20.
- Resumen de scrap y PPM por número de parte.
- Historial y eliminación controlada de registros.
- Exportación a Excel; respaldo automático en CSV si la librería externa no está disponible.
- Almacenamiento local temporal para validación del portal.
- Identidad visual industrial con colores corporativos `#EC6B1E`, `#143980` y `#006732`.

## Publicación

Los archivos `index.html`, `styles.css` y `app.js` deben permanecer en la raíz de la rama publicada por GitHub Pages.

## Nota de arquitectura

Esta beta usa `localStorage`; los datos pertenecen al navegador y equipo donde se capturan. La siguiente etapa debe sustituir la capa de almacenamiento por Supabase para uso multiusuario, permisos y respaldo centralizado.

---

