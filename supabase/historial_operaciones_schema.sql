-- ==============================================================================
-- PazSuma: Esquema para Historial de Operaciones y Política de Retención (15 días)
-- ==============================================================================

-- 1. Tabla de Historial de Operaciones
CREATE TABLE IF NOT EXISTS public.historial_operaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    modulo TEXT NOT NULL,
    accion TEXT NOT NULL,
    detalles TEXT,
    ip_origen TEXT,
    estatus TEXT NOT NULL DEFAULT 'completado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Índices para acelerar búsquedas por módulo, usuario y depuración por fecha
CREATE INDEX IF NOT EXISTS idx_historial_created_at ON public.historial_operaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_modulo ON public.historial_operaciones (modulo);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON public.historial_operaciones (usuario);

-- 3. Políticas de Seguridad de Fila (RLS)
ALTER TABLE public.historial_operaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de historial a usuarios autenticados y publico"
    ON public.historial_operaciones FOR SELECT
    USING (true);

CREATE POLICY "Permitir insercion de operaciones en historial"
    ON public.historial_operaciones FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de operaciones segun politica de retencion"
    ON public.historial_operaciones FOR DELETE
    USING (true);

-- 4. Función programada para la limpieza automática de registros con antigüedad > 15 días
CREATE OR REPLACE FUNCTION public.limpiar_historial_operaciones_15_dias()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Eliminar registros con más de 15 días de antigüedad
    DELETE FROM public.historial_operaciones 
    WHERE created_at < NOW() - INTERVAL '15 days';

    -- Depurar también la tabla audit_logs si existiese en el esquema
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs'
    ) THEN
        DELETE FROM public.audit_logs 
        WHERE created_at < NOW() - INTERVAL '15 days';
    END IF;
END;
$$;

-- 5. Programación automática con pg_cron (Supabase Scheduled Jobs)
-- Ejecuta automáticamente todos los días a las 00:00 UTC (medianoche)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Desprogramar si ya existía para evitar duplicados
DO $$
BEGIN
    PERFORM cron.unschedule('limpieza-historial-15-dias');
EXCEPTION WHEN OTHERS THEN
    -- Continuar si el job no existía
END $$;

-- Programar ejecución diaria
SELECT cron.schedule(
    'limpieza-historial-15-dias',
    '0 0 * * *',
    $$SELECT public.limpiar_historial_operaciones_15_dias();$$
);
