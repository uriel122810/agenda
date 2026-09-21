-- ==============================================================================
-- PazSuma: Esquema para Gestión de Tareas y Operaciones (tasks / tareas)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completada', 'archivada')),
    priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja', 'urgente')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Vista de compatibilidad si se consulta como public.tareas
CREATE OR REPLACE VIEW public.tareas AS
SELECT 
    id,
    title,
    description,
    status,
    priority,
    due_date,
    created_at
FROM public.tasks;

-- Índices de aceleración
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks (created_at DESC);

-- Habilitar Políticas de Seguridad de Nivel de Fila (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura publica y autenticada de tareas"
    ON public.tasks FOR SELECT
    USING (true);

CREATE POLICY "Permitir insercion de tareas"
    ON public.tasks FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de tareas"
    ON public.tasks FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de tareas"
    ON public.tasks FOR DELETE
    USING (true);
