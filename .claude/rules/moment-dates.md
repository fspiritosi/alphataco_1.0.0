# moment.js para Fechas

**SIEMPRE** usar moment.js para cualquier manejo de fechas, NO date-fns.

```typescript
import moment from 'moment';

// Formatear fecha
moment(date).format('DD/MM/YYYY');

// Comparar fechas
moment(date1).isBefore(date2);

// Locale espanol
import 'moment/locale/es';
moment(date).locale('es').format('LL');
```
