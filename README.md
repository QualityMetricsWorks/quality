# QKC Quality Summary — Beta 0.3.1

## Enfoque
Beta 0.3.1 mejora el flujo operativo para ambientes **Low Volume / High Mix**.

### Máquinas
- Nuevo módulo **Máquinas**.
- Relación muchos-a-muchos `part_machines`.
- Una máquina puede correr varios NP.
- Un NP puede correr en varias máquinas.
- En Capturar Producción, al seleccionar el NP solo se muestran sus máquinas vinculadas.
- En la ficha de NP puedes vincular/desvincular máquinas.

### Scrap con matching de producción
Capturar Scrap ahora usa los mismos campos operativos:
- Fecha
- Turno
- Cliente
- NP
- Operación
- Máquina
- Producción reportada (opcional)

El sistema busca la corrida correspondiente.
- 1 coincidencia: se selecciona automáticamente.
- Varias: muestra solo las coincidencias filtradas.
- Ninguna: informa que no existe match.

### Edición de NP
Desde la ficha de Número de Parte puedes editar:
- Descripción
- Costo por pieza
- Moneda
- Máquinas vinculadas

### Dashboard
- Yield usa escala fija **50% a 100%** para hacer visible la variación.
- Scrap, PPM, COPQ y Pareto mantienen su escala actual.

## Instalación
1. En Supabase ejecuta `sql/migrate_0.3.0_to_0.3.1.sql`.
2. Sube a GitHub:
   - `index.html`
   - `config.js`
   - carpeta `assets/`
3. Recarga con `Ctrl + Shift + R`.
4. Verifica que muestre **Beta 0.3.1**.

## Importante
Primero crea las máquinas y luego vincúlalas a los números de parte. A partir de ese momento la captura de producción utilizará únicamente máquinas autorizadas para cada NP.
