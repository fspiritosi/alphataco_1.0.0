# Migraciones con Prisma

## Principio Fundamental

**TODAS las migraciones se gestionan con Prisma.** Los MCPs de Supabase (LOCAL, DEV, PROD) son **readonly** — solo para consultas y verificaciones, NUNCA para aplicar cambios.

## Problema Conocido: Shadow Database

El comando `npx prisma migrate dev` usa un shadow database que replaya todas las migraciones desde cero. La migracion `0_baseline` contiene tablas de Supabase interno (auth, storage) con SQL incompatible con el shadow. Por esto, **NUNCA usar `npx prisma migrate dev`** directamente — siempre seguir el flujo manual descrito abajo.

## Flujo Unico de Migracion (SIEMPRE)

Independientemente del tipo de cambio (estructura, funciones RPC, datos), el flujo es siempre el mismo:

```bash
# 1. Modificar prisma/schema.prisma si el cambio es de estructura (tablas, columnas, relaciones)
#    Si es SQL custom (funciones, triggers, inserts), saltar este paso

# 2. Generar el SQL del diff entre la BD actual y el schema (sin shadow database)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

# 3. Revisar el SQL generado — SOLO tomar los cambios que necesitamos
#    Prisma puede detectar drift y agregar cambios colaterales no deseados

# 4. Crear la carpeta de migracion manualmente
mkdir -p prisma/migrations/YYYYMMDDHHMMSS_nombre_descriptivo

# 5. Crear el archivo migration.sql con SOLO los cambios necesarios
#    Para cambios de estructura: copiar solo el ALTER TABLE / CREATE TABLE relevante del diff
#    Para SQL custom: escribir el SQL directamente (funciones, triggers, inserts)

# 6. Aplicar la migracion directamente (sin shadow)
npx prisma db execute --file prisma/migrations/YYYYMMDDHHMMSS_nombre_descriptivo/migration.sql

# 7. Registrar la migracion como aplicada
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_nombre_descriptivo

# 8. Regenerar el Prisma Client
npx prisma generate

# 9. Verificar con MCP supabase-LOCAL (readonly) que los cambios se aplicaron correctamente
```

## Ejemplos

### Cambio de estructura (agregar columnas)

```bash
# 1. Modificar schema.prisma (agregar columnas al modelo)
# 2. Generar diff
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# 3. Del output, extraer SOLO el ALTER TABLE relevante
# 4-9. Seguir el flujo
```

### SQL custom (funcion RPC, trigger, insert de datos)

```bash
# 1. NO modificar schema.prisma
# 4. Crear carpeta de migracion
# 5. Escribir el SQL manualmente en migration.sql
# 6-9. Seguir el flujo
```

## Verificacion Post-Migracion (OBLIGATORIO)

Despues de TODA migracion, verificar con el MCP `supabase-LOCAL` (readonly):

1. **Para estructura**: consultar la tabla modificada para confirmar que las columnas/tipos son correctos
2. **Para funciones/triggers**: verificar que existen y funcionan
3. **Para datos**: consultar que los registros se insertaron correctamente

```sql
-- Ejemplo de verificacion de columnas
SELECT column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'nombre_tabla'
AND column_name IN ('col1', 'col2')
ORDER BY ordinal_position;
```

## Deploy

En cada deploy se ejecuta `npx prisma migrate deploy`, que aplica automaticamente todas las migraciones pendientes en `prisma/migrations/`.

## Reglas Criticas

1. **NUNCA** usar `npx prisma migrate dev` — el shadow database falla con nuestro baseline
2. **NUNCA** usar MCP de Supabase para aplicar migraciones — son readonly
3. **SIEMPRE** usar el flujo manual: diff → crear carpeta → escribir SQL → db execute → resolve → generate
4. **SIEMPRE** revisar el output de `migrate diff` y tomar SOLO los cambios necesarios (ignorar drift colateral)
5. **SIEMPRE** usar nombres descriptivos en las migraciones (en ingles, snake_case)
6. **SIEMPRE** verificar post-migracion con MCP supabase-LOCAL
7. Si algo falla, usar `npx prisma migrate resolve` para marcar/desmarcar migraciones
