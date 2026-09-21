-- ==============================================================================
-- PAZSUMA - ESQUEMA DE FOLIADOR INSTITUCIONAL PARA DOCUMENTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.document_folios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folio text NOT NULL UNIQUE,
  tipo_documento text NOT NULL DEFAULT 'Oficio',
  asunto text NOT NULL,
  remitente text NOT NULL,
  destinatario text NOT NULL,
  fecha_documento timestamp with time zone DEFAULT now(),
  estatus text NOT NULL DEFAULT 'registrado',
  prioridad text NOT NULL DEFAULT 'normal',
  archivo_nombre text,
  archivo_tamano text,
  notas text,
  foliado_digital boolean DEFAULT false,
  creador_email text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.document_folios ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
DROP POLICY IF EXISTS "folios_all" ON public.document_folios;
CREATE POLICY "folios_all" ON public.document_folios FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "folios_anon_read" ON public.document_folios;
CREATE POLICY "folios_anon_read" ON public.document_folios FOR SELECT TO anon USING (true);
