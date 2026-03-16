# Idioma del Codigo: Ingles

**TODO el codigo debe estar en ingles**: nombres de archivos, carpetas, funciones, variables, componentes, hooks, tipos, constantes, etc.

**Excepciones en espanol**: comentarios, strings de UI visibles al usuario (labels, placeholders, mensajes), y slugs/IDs que ya existen en la base de datos.

```typescript
// ❌ INCORRECTO - Nombres en espanol
function obtenerEmpleadosActivos() { ... }
const empleadoSeleccionado = useState(null);
export function BandejaAprobaciones() { ... }

// ✅ CORRECTO - Nombres en ingles, UI en espanol
function getActiveEmployees() { ... }
const selectedEmployee = useState(null);
export function ApprovalInbox() { ... }

// ✅ CORRECTO - Strings de UI en espanol
<Button>Crear Nuevo</Button>
<CardTitle>Seguimiento en Taller</CardTitle>
toast.success('Empleado creado exitosamente');
```

**La comunicacion con Claude (chat) debe ser en espanol.**
