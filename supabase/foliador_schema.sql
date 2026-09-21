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
  estatus text NOT NULL DEFAULT 'registrado' CHECK (estatus IN ('registrado', 'en_tramite', 'atendido', 'archivado', 'cancelado')),
  prioridad text NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'urgente', 'muy_urgente')),
  archivo_nombre text,
  archivo_tamano text,
  archivo_url text,
  notas text,
  foliado_digital boolean DEFAULT false,
  creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creador_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_document_folios_folio ON public.document_folios(folio);
CREATE INDEX IF NOT EXISTS idx_document_folios_estatus ON public.document_folios(estatus);
CREATE INDEX IF NOT EXISTS idx_document_folios_tipo ON public.document_folios(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_document_folios_created_at ON public.document_folios(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.document_folios ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "folios_select_authenticated" ON public.document_folios;
CREATE POLICY "folios_select_authenticated" ON public.document_folios
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "folios_insert_authenticated" ON public.document_folios;
CREATE POLICY "folios_insert_authenticated" ON public.document_folios
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "folios_update_authenticated" ON public.document_folios;
CREATE POLICY "folios_update_authenticated" ON public.document_folios
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "folios_delete_authenticated" ON public.document_folios;
CREATE POLICY "folios_delete_authenticated" ON public.document_folios
  FOR DELETE TO authenticated USING (true);
