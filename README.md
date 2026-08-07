# QKC Quality Summary — Beta 0.3.0

## Objetivo de esta versión
Beta 0.3.0 separa Producción y Scrap para evitar duplicar cantidades producidas cuando una misma corrida genera múltiples defectos.

### Nuevo modelo
- `production_runs`: una fila por corrida/registro de producción.
- `scrap_events`: múltiples eventos de calidad vinculados a una corrida.
- `part_numbers.cost_per_piece`: costo estándar por pieza.
- `part_numbers.currency`: moneda del costo estándar.

### KPIs
- Producción
- Scrap %
- PPM
- Yield
- COPQ Scrap
- Pareto 80/20
- Top 3 NP con sus Top 3 defectos
- Tendencias separadas de Scrap, PPM, Yield y COPQ

### Captura
1. **Capturar Producción**: fecha, turno, cliente, NP, operación, máquina y cantidad producida.
2. **Capturar Scrap**: seleccionar una corrida y agregar tantos defectos/eventos como sean necesarios.

Ejemplo:
- Producción: 600
- Evento 1: Rebaba, 2
- Evento 2: Runout, 1
- Evento 3: Rosca, 2
- Scrap total: 5
- Producción no se duplica.

## Instalación desde Beta 0.2.0
1. No borres las tablas actuales.
2. En Supabase → SQL Editor ejecuta `sql/migrate_0.2.0_to_0.3.0.sql`.
3. Sube a GitHub `index.html`, `config.js` y la carpeta `assets`.
4. Recarga con Ctrl+Shift+R.
5. Verifica que muestre **Beta 0.3.0**.

## Estructura
```
index.html
config.js
assets/
  css/main.css
  js/
    app.js
    db.js
    state.js
    metrics.js
    ui.js
    utils.js
sql/
  migrate_0.2.0_to_0.3.0.sql
```

Los `.txt` incluidos son copias exactas de cada `.js`, para facilitar la carga manual.

## OEE
`planned_minutes` se incluye desde ahora como campo opcional para preparar la futura integración de OEE. Beta 0.3.0 todavía no calcula OEE.
