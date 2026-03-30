# Reglas de Git

## NO Commit Automatico

**NUNCA** realizar commits automaticamente. Solo hacer commit cuando el usuario lo indique explicitamente (ej: "commitea", "hace commit", "push", etc.). No asumir que se debe commitear despues de completar una tarea.

## NUNCA Co-Authored-By en Commits

**ESTRICTAMENTE PROHIBIDO** agregar `Co-Authored-By` en los mensajes de commit. JAMAS incluir referencias a IA, Claude, o cualquier co-autor automatico en los commits.

```bash
# ❌ PROHIBIDO - NUNCA hacer esto
git commit -m "feat: something

Co-Authored-By: Claude <noreply@anthropic.com>"

# ✅ CORRECTO - Solo el mensaje del commit
git commit -m "feat: something"
```

## Conventional Commits

Usar formato de conventional commits para los mensajes:

- `feat:` — nueva funcionalidad
- `fix:` — correccion de bug
- `refactor:` — reestructuracion sin cambio de comportamiento
- `style:` — formateo, semicolons, etc.
- `docs:` — documentacion
- `chore:` — tareas de mantenimiento
- `perf:` — mejoras de rendimiento

## Verificacion Pre-Commit

Antes de commitear, ejecutar:

1. `npm run check-types` — verificar que compila
2. Revisar el diff para detectar problemas (seguridad, `:any`, `console.*`, etc.)
