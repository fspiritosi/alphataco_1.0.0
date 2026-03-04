# Evitar useEffect Innecesarios

## Principio Fundamental

**NUNCA** usar `useEffect` para reaccionar a cambios de estado que nosotros mismos provocamos. Mover la logica al punto de origen.

## Reglas

- Si se ejecuta al hacer click → mover al `onClick`
- Si se ejecuta al actualizar un registro → mover a la funcion de update/submit
- Si se ejecuta cuando cambia una prop → evaluar si se puede derivar directamente
- `useEffect` solo para: suscripciones, event listeners del DOM, sincronizacion con APIs externas

## Ejemplos

```typescript
// ❌ INCORRECTO - useEffect para reaccionar a cambio de estado propio
const [count, setCount] = useState(0);
const [message, setMessage] = useState('');
useEffect(() => {
  setMessage(`Count is ${count}`);
}, [count]);

// ✅ CORRECTO - Derivar directamente
const [count, setCount] = useState(0);
const message = `Count is ${count}`;

// ❌ INCORRECTO - useEffect para logica de click
useEffect(() => {
  if (selectedItem) {
    form.reset(prepareFormData(selectedItem));
  }
}, [selectedItem]);

// ✅ CORRECTO - Mover al handler
const handleSelectItem = (item) => {
  setSelectedItem(item);
  form.reset(prepareFormData(item));
};
```

## Usos Validos de useEffect

```typescript
// ✅ Suscripcion a evento externo
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    /* ... */
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);

// ✅ Sincronizacion con API externa (WebSocket, etc.)
useEffect(() => {
  const channel = supabase.channel('changes').on('postgres_changes', handleChange).subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```
