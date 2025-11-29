# Flujo de Creación de Usuarios con Roles y Permisos

## 📋 Resumen

Este documento describe el flujo correcto para crear usuarios y asignarles roles con permisos en el sistema.

---

## 🎯 Objetivo

Cuando se crea un usuario (ya sea creándolo directamente o invitándolo), debe quedar automáticamente con:

- ✅ Acceso a la empresa
- ✅ Rol asignado
- ✅ Permisos del rol activos

---

## 🔄 Flujo Completo

### 1️⃣ **Crear/Invitar Usuario** → Tabla `auth.users` + `profile`

**Acción:** Crear el usuario en Supabase Auth y su perfil

```typescript
// Invitar usuario
const { data: authData } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
  data: { fullname, needs_password_change: true },
});

// Crear perfil
await adminSupabase.from('profile').insert([
  {
    id: userId,
    email: values.email,
    fullname: fullname,
    role: roleName, // ⚠️ Campo legacy: usa roles.name (text), no roles.id
    credential_id: userId,
  },
]);
```

**Importante:**

- `profile.role` es un campo **legacy** de tipo `text`
- Hace referencia a `roles.name`, NO a `roles.id`
- Valor por defecto: `'User'`

---

### 2️⃣ **Compartir Empresa** → Tabla `share_company_users`

**Acción:** Vincular el usuario con la empresa

```typescript
await supabase.from('share_company_users').insert([
  {
    company_id: company,
    profile_id: userId,
    customer_id: values.customer || null,
    // ❌ NO incluir 'role' - esta columna NO EXISTE
  },
]);
```

**Estructura de `share_company_users`:**

- ✅ `id` (UUID)
- ✅ `created_at` (timestamp)
- ✅ `profile_id` (UUID → profile.id)
- ✅ `company_id` (UUID → company.id)
- ✅ `customer_id` (UUID → customers.id, nullable)
- ✅ `modules` (array, nullable)
- ❌ **NO tiene columna `role`**

---

### 3️⃣ **Asignar Rol** → Tabla `user_roles`

**Acción:** Asignar el rol en el sistema de permisos

```typescript
const roleId = Number(values.role); // El formulario envía el ID como string

await supabase.from('user_roles').insert([
  {
    user_id: userId,
    role_id: roleId, // ✅ Tipo: bigint (número)
  },
]);
```

**Estructura de `user_roles`:**

- ✅ `id` (UUID)
- ✅ `user_id` (UUID → auth.users.id)
- ✅ `role_id` (bigint → roles.id)
- ✅ `assigned_by` (UUID, nullable)
- ✅ `assigned_at` (timestamp)

**Importante:**

- `role_id` es de tipo `bigint` (número)
- El formulario envía `role.id.toString()`, por eso se hace `Number(values.role)`
- Esta tabla es la que controla los permisos reales del usuario

---

## 🗂️ Arquitectura de Tablas

### Sistema Legacy (en desuso)

```
profile.role (text) → roles.name (text)
```

- Campo antiguo que todavía existe por compatibilidad
- Se debe mantener sincronizado con el nombre del rol
- **NO se usa para verificar permisos**

### Sistema Actual (RBAC)

```
user_roles.role_id (bigint) → roles.id (bigint)
                                  ↓
                          role_permissions
                                  ↓
                    tabs + actions = PERMISOS
```

- Sistema moderno basado en RBAC
- **Este es el que se usa para verificar permisos**
- Soporta múltiples roles por usuario
- Permite permisos personalizados con `user_permissions`

---

## 📝 Código Corregido

### Archivo: `src/app/actions/register-user.ts`

#### Para Usuario Nuevo:

```typescript
// 1. Invitar usuario
const { data: authData } = await adminSupabase.auth.admin.inviteUserByEmail(values.email, {
  redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirm`,
  data: { fullname, needs_password_change: true },
});

userId = authData.user?.id;

// 2. Obtener nombre del rol para campo legacy
const roleId = Number(values.role);
let roleName = 'User';

if (!isNaN(roleId)) {
  const { data: roleData } = await supabase.from('roles').select('name').eq('id', roleId).single();

  if (roleData) roleName = roleData.name;
}

// 3. Crear perfil
await adminSupabase.from('profile').insert([
  {
    id: userId,
    email: values.email,
    fullname: fullname,
    role: roleName, // ✅ Nombre del rol (text)
    credential_id: userId,
  },
]);

// 4. Compartir empresa (SIN columna role)
await adminSupabase.from('share_company_users').insert([
  {
    company_id: company,
    profile_id: userId,
    customer_id: values.customer || null,
  },
]);

// 5. Asignar rol en sistema de permisos
await supabase.from('user_roles').insert([
  {
    user_id: userId,
    role_id: roleId, // ✅ ID del rol (bigint)
  },
]);
```

#### Para Usuario Existente:

```typescript
// 1. Compartir empresa (SIN columna role)
await supabase.from('share_company_users').insert([
  {
    company_id: company,
    profile_id: profile.id,
    customer_id: values.customer || null,
  },
]);

// 2. Asignar rol en sistema de permisos
const roleId = Number(values.role);

if (!isNaN(roleId)) {
  // Verificar si ya tiene el rol
  const { data: existingRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', profile.id)
    .eq('role_id', roleId)
    .single();

  // Solo asignar si no lo tiene
  if (!existingRole) {
    await supabase.from('user_roles').insert([
      {
        user_id: profile.id,
        role_id: roleId,
      },
    ]);
  }
}
```

---

## 🎨 Formulario: `create-user-form.tsx`

El formulario envía el **ID del rol como string**:

```typescript
<SelectItem key={role.id} value={role.id.toString()}>
  {role.name}
</SelectItem>
```

Por eso en el backend se hace:

```typescript
const roleId = Number(values.role);
```

---

## ✅ Verificación del Flujo

Después de crear un usuario, debe tener:

1. **Registro en `auth.users`**

   ```sql
   SELECT * FROM auth.users WHERE email = 'usuario@example.com';
   ```

2. **Perfil en `profile`**

   ```sql
   SELECT id, email, fullname, role FROM profile WHERE email = 'usuario@example.com';
   ```

3. **Acceso a empresa en `share_company_users`**

   ```sql
   SELECT * FROM share_company_users WHERE profile_id = 'user-uuid';
   ```

4. **Rol asignado en `user_roles`**

   ```sql
   SELECT ur.*, r.name, r.slug
   FROM user_roles ur
   JOIN roles r ON ur.role_id = r.id
   WHERE ur.user_id = 'user-uuid';
   ```

5. **Permisos activos** (verificar con función SQL)
   ```sql
   SELECT * FROM get_user_permissions('user-uuid');
   ```

---

## 🐛 Problemas Resueltos

### ❌ Problema 1: Columna `role` no existe en `share_company_users`

**Error:**

```typescript
await supabase.from('share_company_users').insert([
  {
    role: Number(values.role), // ❌ Esta columna NO EXISTE
  },
]);
```

**Solución:**

```typescript
// Eliminar la línea, la columna no existe
await supabase.from('share_company_users').insert([
  {
    company_id: company,
    profile_id: userId,
    customer_id: values.customer || null,
  },
]);
```

---

### ❌ Problema 2: Confusión entre `profile.role` (text) y `user_roles.role_id` (bigint)

**Error:**

```typescript
// Intentar insertar ID en campo que espera nombre
await supabase.from('profile').insert([
  {
    role: values.role, // ❌ values.role es "5", pero profile.role espera "Admin"
  },
]);
```

**Solución:**

```typescript
// Obtener el nombre del rol desde el ID
const roleId = Number(values.role);
const { data: roleData } = await supabase.from('roles').select('name').eq('id', roleId).single();

await supabase.from('profile').insert([
  {
    role: roleData.name, // ✅ "Admin" (text)
  },
]);
```

---

### ❌ Problema 3: Buscar rol por nombre en lugar de usar ID directamente

**Error:**

```typescript
// Buscar el rol por nombre cuando ya tenemos el ID
const { data: roleData } = await supabase
  .from('roles')
  .select('id')
  .or(`name.eq.${values.role},slug.eq.${values.role}`)
  .single();
```

**Solución:**

```typescript
// Usar el ID directamente
const roleId = Number(values.role);

await supabase.from('user_roles').insert([
  {
    user_id: userId,
    role_id: roleId, // ✅ Ya tenemos el ID
  },
]);
```

---

## 📚 Referencias

- **Sistema de Roles y Permisos:** [04-sistema-roles-permisos.md](./04-sistema-roles-permisos.md)
- **Convenciones TypeScript:** [typescript-conventions.md](../.kiro/steering/typescript-conventions.md)
- **Documentación Supabase Auth:** https://supabase.com/docs/guides/auth

---

**Última actualización:** 2024-11-27
**Autor:** Sistema de Documentación CodeControl
