-- Smoke test del sistema de permisos: los 3 roles de acceso total tienen la
-- misma cantidad de role_permissions (ver CLAUDE.md "Permisos: 3 roles de
-- acceso completo"), existe el rol `User` (default de profile.role), y
-- user_has_permission responde false/true segun exista (y tenga el rol) el usuario.
BEGIN;

SELECT plan(6);

-- (0) el seed crea el rol `User`: es el DEFAULT de profile.role (FK a roles.name);
-- sin el, cualquier INSERT en profile que no fije `role` falla por FK.
SELECT ok(
  (SELECT count(*) FROM roles WHERE name = 'User') = 1,
  'roles: existe el rol User (default de profile.role)'
);

-- (i) admin, administrador y full-access-provisional tienen exactamente la
-- misma cantidad de role_permissions (suma de acciones permitidas por tab),
-- y esa cantidad es mayor a cero.
SELECT is(
  (SELECT count(*)::int FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.slug = 'admin'),
  (SELECT count(*)::int FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.slug = 'administrador'),
  'role_permissions: admin y administrador tienen la misma cantidad'
);

SELECT is(
  (SELECT count(*)::int FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.slug = 'admin'),
  (SELECT count(*)::int FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.slug = 'full-access-provisional'),
  'role_permissions: admin y full-access-provisional tienen la misma cantidad'
);

SELECT ok(
  (SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.slug = 'admin') > 0,
  'role_permissions: admin tiene permisos cargados (> 0)'
);

-- (ii) usuario inexistente -> false
SELECT is(
  user_has_permission('00000000-0000-0000-0000-0000000000ff'::uuid, 'dashboard', 'principal', 'view'),
  false,
  'user_has_permission: usuario inexistente no tiene permiso'
);

-- (iii) usuario con rol admin -> true
-- profile.id es NOT NULL sin default; user_roles.user_id referencia
-- profile.credential_id. Se usa el mismo uuid para id y credential_id.
-- `role` no se fija: toma el DEFAULT 'User', que el seed garantiza (ver (0)).
INSERT INTO profile (id, credential_id, email)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'pgtap-permissions-test@alphataco.local'
);

INSERT INTO user_roles (user_id, role_id)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, r.id
FROM roles r
WHERE r.slug = 'admin';

SELECT is(
  user_has_permission('11111111-1111-1111-1111-111111111111'::uuid, 'dashboard', 'principal', 'view'),
  true,
  'user_has_permission: usuario con rol admin tiene permiso dashboard/principal/view'
);

SELECT * FROM finish();

ROLLBACK;
