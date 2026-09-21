-- ==============================================================================
-- PazSuma: Esquema para Registro de Auditoría y Trazabilidad (audit_logs)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_origin TEXT,
    status TEXT NOT NULL DEFAULT 'completado',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de aceleración para búsqueda y filtrado
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_name ON public.audit_logs (user_name);

-- Seguridad a nivel de fila (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de auditoria a usuarios autenticados"
    ON public.audit_logs FOR SELECT
    USING (true);

CREATE POLICY "Permitir insercion de logs de auditoria"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);
