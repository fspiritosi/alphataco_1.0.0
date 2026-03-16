# NO Usar Dialogs Nativos del Navegador

**NUNCA** usar `window.confirm()`, `window.alert()` o `window.prompt()`. SIEMPRE usar componentes de UI de shadcn (`AlertDialog`, `Dialog`, `toast`) para confirmaciones y alertas.

```typescript
// ❌ INCORRECTO - NUNCA usar nativos
const confirmed = window.confirm('¿Desea eliminar?');
window.alert('Operacion exitosa');

// ✅ CORRECTO - Usar AlertDialog de shadcn
<AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Desea eliminar?</AlertDialogTitle>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```
