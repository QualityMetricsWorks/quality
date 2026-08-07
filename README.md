# Quality Summary — Beta 0.2.0

Beta 0.2.0 introduce una base de datos central en Supabase con arquitectura multiempresa segura.

## Arquitectura

- Frontend: GitHub Pages
- Login: Supabase Auth
- Base de datos: Supabase PostgreSQL
- Seguridad: Row Level Security (RLS)
- Modelo: Empresa (oculta) → Cliente → Número de Parte → Operación → Defecto → Captura
- Realtime: desactivado intencionalmente en esta Beta

## Seguridad multiempresa

`companies` existe en la base, pero NO existe una pantalla de empresas en el frontend.

Cada usuario tiene un registro en `profiles` con un `company_id`. Las políticas RLS solo permiten leer registros cuyo `company_id` coincide con el usuario autenticado. Por diseño, un usuario no puede enumerar las demás empresas que usan la plataforma.

Roles disponibles:

- `admin`: administra maestros, captura y eliminación.
- `editor`: administra maestros y captura.
- `operator`: captura producción/scrap y consulta.
- `viewer`: solo consulta.

## Instalación inicial

### 1. Ejecutar el esquema

En Supabase → SQL Editor, abre y ejecuta COMPLETO:

`supabase_schema.sql`

> Este script reconstruye las tablas públicas de Quality Summary. NO elimina usuarios de Supabase Auth.

### 2. Vincular tu usuario con la primera empresa

Abre:

`bootstrap_first_company.sql`

Reemplaza:

- `REPLACE_WITH_YOUR_COMPANY_NAME`
- `REPLACE_WITH_YOUR_AUTH_EMAIL`

Ejecuta el script. El usuario quedará como `admin` de esa empresa.

### 3. Verificar

En Table Editor deben existir:

- companies
- profiles
- clients
- part_numbers
- operations
- defects
- production_records

RLS debe aparecer como Enabled. `Realtime = Disabled` es correcto para esta Beta.

### 4. Subir a GitHub

Sube a la raíz del repositorio:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`
- `README.md`

Los archivos `.txt` son copias exactas de los JavaScript para facilitar descarga/copia:

- `app.txt` → renombrar a `app.js` si lo necesitas
- `config.txt` → renombrar a `config.js` si lo necesitas

Los SQL no necesitan estar publicados en GitHub para que la aplicación funcione; pueden conservarse solo como respaldo técnico.

## Configuración Supabase incluida

`config.js` ya incluye la Project URL y Publishable Key configuradas para este proyecto.

Nunca colocar en el frontend:

- `service_role`
- `sb_secret_...`
- cualquier Secret Key

## Flujo de uso

1. Login.
2. Crear Cliente.
3. Crear Número de Parte para ese cliente.
4. Entrar a la ficha del NP y crear sus Operaciones/Procesos.
5. Crear defectos y asignarlos a una operación o dejarlos como Generales.
6. Capturar Producción + Scrap.
7. Dashboard e Historial consultan la base central.

## Migración desde Beta 0.1.5

Desde la computadora/navegador que todavía contenga los datos locales, usa `Importar 0.1.5` después de iniciar sesión. Los datos serán migrados a la empresa del usuario autenticado.

## Nota sobre Realtime

No es necesario habilitar Supabase Realtime para compartir información entre equipos. Cada equipo consulta la misma base PostgreSQL. El botón `Actualizar` vuelve a consultar Supabase. Realtime se podrá habilitar en una versión posterior para tableros que deban actualizarse automáticamente sin refrescar.
