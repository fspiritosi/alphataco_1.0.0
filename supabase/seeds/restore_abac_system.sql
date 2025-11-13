-- =====================================================
-- RESTAURACIÓN COMPLETA DEL SISTEMA ABAC
-- =====================================================
-- Este script recrea el sistema ABAC (Attribute-Based Access Control)
-- Basado en database.types.ts y seed-tabs-structure.sql

-- =====================================================
-- 1. TABLAS PRINCIPALES
-- =====================================================

-- Tabla de módulos (ya existe, solo agregar campos faltantes si no existen)
-- NOTA: Esta tabla se usa tanto para módulos contratables (hired_modules) 
-- como para el sistema de permisos ABAC
DO $$ 
BEGIN
    -- Agregar slug si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.modules ADD COLUMN slug TEXT UNIQUE;
    END IF;
    
    -- Agregar icon si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'icon'
    ) THEN
        ALTER TABLE public.modules ADD COLUMN icon TEXT;
    END IF;
    
    -- Agregar order_index si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.modules ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.modules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Agregar is_active si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.modules ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Tabla de tabs (con jerarquía)
CREATE TABLE IF NOT EXISTS public.tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    parent_tab_id UUID REFERENCES public.tabs(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(module_id, slug)
);

-- Tabla de acciones
CREATE TABLE IF NOT EXISTS public.actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar acciones básicas si no existen
INSERT INTO public.actions (slug, name, description) VALUES
    ('view', 'Ver', 'Permite ver y leer información'),
    ('create', 'Crear', 'Permite crear nuevos registros'),
    ('update', 'Editar', 'Permite modificar registros existentes'),
    ('delete', 'Eliminar', 'Permite eliminar registros')
ON CONFLICT (slug) DO NOTHING;

-- Agregar campos faltantes a la tabla roles si no existen
DO $$ 
BEGIN
    -- Agregar color si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'color'
    ) THEN
        ALTER TABLE public.roles ADD COLUMN color TEXT;
    END IF;
    
    -- Agregar description si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.roles ADD COLUMN description TEXT;
    END IF;
    
    -- Agregar slug si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.roles ADD COLUMN slug TEXT UNIQUE;
    END IF;
    
    -- Agregar is_system si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'is_system'
    ) THEN
        ALTER TABLE public.roles ADD COLUMN is_system BOOLEAN DEFAULT false;
    END IF;
    
    -- Agregar updated_at si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.roles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Tabla de permisos de roles
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id BIGINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_id, tab_id, action_id)
);

-- Tabla de roles de usuarios
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role_id)
);

-- Tabla de permisos personalizados de usuarios
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT true,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, tab_id, action_id)
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tabs_module_id ON public.tabs(module_id);
CREATE INDEX IF NOT EXISTS idx_tabs_parent_tab_id ON public.tabs(parent_tab_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tab_id ON public.role_permissions(tab_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_tab_id ON public.user_permissions(tab_id);

-- =====================================================
-- 3. FUNCIÓN RPC: get_user_permissions
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE(
    module_id uuid, 
    module_slug text, 
    module_name text, 
    tab_id uuid, 
    tab_slug text, 
    tab_name text, 
    action_id uuid, 
    action_slug text, 
    action_name text, 
    source text, 
    is_granted boolean,
    role_id bigint,
    role_name text,
    role_color text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH user_role_permissions AS (
        -- Get permissions from user's roles
        SELECT DISTINCT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'role' as source,
            true as is_granted,
            r.id as role_id,
            r.name as role_name,
            r.color as role_color
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.tabs t ON rp.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON rp.action_id = a.id
        WHERE ur.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
            AND r.is_active = true
    ),
    user_custom_permissions AS (
        -- Get custom permissions (overrides)
        SELECT
            m.id as module_id,
            m.slug as module_slug,
            m.name as module_name,
            t.id as tab_id,
            t.slug as tab_slug,
            t.name as tab_name,
            a.id as action_id,
            a.slug as action_slug,
            a.name as action_name,
            'custom' as source,
            up.is_granted,
            NULL::bigint as role_id,
            NULL::text as role_name,
            NULL::text as role_color
        FROM public.user_permissions up
        JOIN public.tabs t ON up.tab_id = t.id
        JOIN public.modules m ON t.module_id = m.id
        JOIN public.actions a ON up.action_id = a.id
        WHERE up.user_id = p_user_id
            AND m.is_active = true
            AND t.is_active = true
    )
    -- Combine both, with custom permissions taking precedence
    SELECT DISTINCT ON (
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id)
    )
        COALESCE(ucp.module_id, urp.module_id),
        COALESCE(ucp.module_slug, urp.module_slug),
        COALESCE(ucp.module_name, urp.module_name),
        COALESCE(ucp.tab_id, urp.tab_id),
        COALESCE(ucp.tab_slug, urp.tab_slug),
        COALESCE(ucp.tab_name, urp.tab_name),
        COALESCE(ucp.action_id, urp.action_id),
        COALESCE(ucp.action_slug, urp.action_slug),
        COALESCE(ucp.action_name, urp.action_name),
        COALESCE(ucp.source, urp.source),
        COALESCE(ucp.is_granted, urp.is_granted),
        COALESCE(ucp.role_id, urp.role_id),
        COALESCE(ucp.role_name, urp.role_name),
        COALESCE(ucp.role_color, urp.role_color)
    FROM user_role_permissions urp
    FULL OUTER JOIN user_custom_permissions ucp 
        ON urp.tab_id = ucp.tab_id AND urp.action_id = ucp.action_id
    WHERE COALESCE(ucp.is_granted, urp.is_granted) = true
    ORDER BY 
        COALESCE(ucp.module_id, urp.module_id), 
        COALESCE(ucp.tab_id, urp.tab_id), 
        COALESCE(ucp.action_id, urp.action_id), 
        ucp.source NULLS LAST;
END;
$function$;

-- =====================================================
-- 4. FUNCIÓN RPC: user_has_permission
-- =====================================================

DROP FUNCTION IF EXISTS public.user_has_permission(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id uuid,
    p_module_slug text,
    p_tab_slug text,
    p_action_slug text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_has_permission boolean;
BEGIN
    -- Check if user has the permission (from role or custom)
    SELECT EXISTS (
        SELECT 1
        FROM public.get_user_permissions(p_user_id) up
        WHERE up.module_slug = p_module_slug
            AND up.tab_slug = p_tab_slug
            AND up.action_slug = p_action_slug
            AND up.is_granted = true
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$function$;

-- =====================================================
-- 5. FUNCIÓN RPC: get_user_accessible_modules
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_accessible_modules(uuid);

CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(p_user_id uuid)
RETURNS TABLE(
    module_id uuid,
    module_slug text,
    module_name text,
    module_icon text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        m.id,
        m.slug,
        m.name,
        m.icon
    FROM public.modules m
    WHERE m.is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.get_user_permissions(p_user_id) up
            WHERE up.module_id = m.id
        )
    ORDER BY m.order_index, m.name;
END;
$function$;

-- =====================================================
-- 6. POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- BORRAR ESTO MAS ADELANTE - Políticas temporales para desarrollo
DROP POLICY IF EXISTS "BORRAR ESTO MAS ADELANTE" ON public.modules;
CREATE POLICY "BORRAR ESTO MAS ADELANTE" ON public.modules
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "BORRAR ESTO MAS ADELANTE" ON public.tabs;
CREATE POLICY "BORRAR ESTO MAS ADELANTE" ON public.tabs
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "BORRAR ESTO MAS ADELANTE" ON public.actions;
CREATE POLICY "BORRAR ESTO MAS ADELANTE" ON public.actions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "BORRAR ESTO MAS ADELANTE" ON public.role_permissions;
CREATE POLICY "BORRAR ESTO MAS ADELANTE" ON public.role_permissions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "BORRAR ESTO MAS ADELANTE" ON public.user_roles;
CREATE POLICY "BORRAR ESTO MAS ADELANTE" ON public.user_roles
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "BORRAR ESTO MAS ADELANTE" ON public.user_permissions;
CREATE POLICY "BORRAR ESTO MAS ADELANTE" ON public.user_permissions
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 7. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.modules IS 'Módulos del sistema (usados para hired_modules Y para el sistema ABAC de permisos)';
COMMENT ON TABLE public.tabs IS 'Tabs y subtabs dentro de cada módulo (estructura jerárquica)';
COMMENT ON TABLE public.actions IS 'Acciones disponibles (view, create, update, delete)';
COMMENT ON TABLE public.role_permissions IS 'Permisos asignados a roles';
COMMENT ON TABLE public.user_roles IS 'Roles asignados a usuarios';
COMMENT ON TABLE public.user_permissions IS 'Permisos personalizados de usuarios (overrides)';

COMMENT ON FUNCTION public.get_user_permissions(uuid) IS 'Obtiene todos los permisos de un usuario (roles + custom) con información del rol';
COMMENT ON FUNCTION public.user_has_permission(uuid, text, text, text) IS 'Verifica si un usuario tiene un permiso específico';
COMMENT ON FUNCTION public.get_user_accessible_modules(uuid) IS 'Obtiene los módulos a los que un usuario tiene acceso';
