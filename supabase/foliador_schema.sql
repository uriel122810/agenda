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
  archivo_url text,
  notas text,
  foliado_digital boolean DEFAULT false,
  creador_email text,
  created_at timestamp with time zone DEFAULT now()
);

-- Asegurar columna archivo_url si la tabla ya existía
ALTER TABLE public.document_folios ADD COLUMN IF NOT EXISTS archivo_url text;

-- Habilitar RLS
ALTER TABLE public.document_folios ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
DROP POLICY IF EXISTS "folios_all" ON public.document_folios;
CREATE POLICY "folios_all" ON public.document_folios FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "folios_anon_read" ON public.document_folios;
CREATE POLICY "folios_anon_read" ON public.document_folios FOR SELECT TO anon USING (true);

-- Bucket de almacenamiento para archivos de folios (documentos_folios)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos_folios', 'documentos_folios', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documentos_folios_read" ON storage.objects;
CREATE POLICY "documentos_folios_read" ON storage.objects FOR SELECT USING (bucket_id = 'documentos_folios');

DROP POLICY IF EXISTS "documentos_folios_insert" ON storage.objects;
CREATE POLICY "documentos_folios_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documentos_folios');
