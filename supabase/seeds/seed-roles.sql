-- ============================================
-- ACTUALIZAR ROLES CON INFORMACIÓN COMPLETA
-- Agregar colores, descripciones y slugs a los roles existentes
-- ============================================

-- Actualizar roles del sistema (intern = true)
UPDATE roles SET
    color = '#DC2626',
    description = 'Acceso total al sistema con permisos de administración completos',
    slug = 'super-admin',
    is_system = true,
    updated_at = now()
WHERE name = 'Super Admin';

UPDATE roles SET
    color = '#EA580C',
    description = 'Administrador con permisos amplios pero limitados',
    slug = 'admin',
    is_system = true,
    updated_at = now()
WHERE name = 'Admin';

UPDATE roles SET
    color = '#7C3AED',
    description = 'Rol de auditoría con permisos de solo lectura',
    slug = 'auditor',
    is_system = true,
    updated_at = now()
WHERE name = 'Auditor';

UPDATE roles SET
    color = '#0891B2',
    description = 'Cliente con acceso a CodeControl',
    slug = 'codecontrol-client',
    is_system = true,
    updated_at = now()
WHERE name = 'CodeControlClient';

UPDATE roles SET
    color = '#059669',
    description = 'Desarrollador con acceso técnico al sistema',
    slug = 'developer',
    is_system = true,
    updated_at = now()
WHERE name = 'Developer';

-- Actualizar roles personalizados (intern = false)
UPDATE roles SET
    color = '#2563EB',
    description = 'Usuario estándar del sistema',
    slug = 'usuario',
    is_system = false,
    updated_at = now()
WHERE name = 'Usuario';

UPDATE roles SET
    color = '#64748B',
    description = 'Usuario invitado con permisos limitados',
    slug = 'invitado',
    is_system = false,
    updated_at = now()
WHERE name = 'Invitado';

UPDATE roles SET
    color = '#F59E0B',
    description = 'Administrador de la empresa',
    slug = 'administrador',
    is_system = false,
    updated_at = now()
WHERE name = 'Administrador';

-- Verificar los cambios
SELECT 
    id,
    name,
    slug,
    color,
    description,
    intern as es_interno,
    is_system as es_sistema,
    is_active as activo
FROM roles
ORDER BY id;
