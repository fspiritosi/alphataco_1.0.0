# NUNCA Ejecutar Comandos de Formateo ni Linting

**ESTRICTAMENTE PROHIBIDO** ejecutar cualquier comando de formateo o linting. Estos comandos modifican cientos de archivos no relacionados con la tarea actual, contaminando el diff y generando cambios no deseados.

## Comandos Prohibidos

```bash
# NUNCA ejecutar estos comandos:
npm run lint          # PROHIBIDO — modifica archivos
npm run format        # PROHIBIDO — modifica archivos
npx prettier          # PROHIBIDO — modifica archivos
npx eslint            # PROHIBIDO — puede modificar archivos con --fix
npx next lint         # PROHIBIDO — es el mismo que npm run lint
```

## Unico Comando de Verificacion Permitido

```bash
npm run check-types   # PERMITIDO — solo verifica, no modifica archivos
```

## Razon

Prettier y ESLint con autofix tocan todos los archivos del proyecto indiscriminadamente, generando cientos de cambios cosmeticos que contaminan el historial de git y hacen imposible revisar los cambios reales de una feature.

La verificacion de calidad se hace exclusivamente con `npm run check-types` (TypeScript) y revision manual del diff.
