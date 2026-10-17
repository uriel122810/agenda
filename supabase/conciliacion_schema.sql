-- ==============================================================================
-- PAZSUMA - CONCILIACIÓN BANCARIA
-- Un registro por periodo de conciliación (cuenta + número). El periodo completo
-- (movimientos de libros y banco, grupos conciliados, criterios y cierre) se
-- guarda en `data` (jsonb). Los periodos con estado 'cerrado' son históricos.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.conciliaciones_bancarias (
  id text PRIMARY KEY,
  cuenta_id text NOT NULL,
  numero integer NOT NULL,
  fecha_corte date NOT NULL,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (cuenta_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_conciliaciones_cuenta ON public.conciliaciones_bancarias (cuenta_id, numero);

ALTER TABLE public.conciliaciones_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conciliaciones_all_auth" ON public.conciliaciones_bancarias;
CREATE POLICY "conciliaciones_all_auth" ON public.conciliaciones_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "conciliaciones_all_anon" ON public.conciliaciones_bancarias;
CREATE POLICY "conciliaciones_all_anon" ON public.conciliaciones_bancarias FOR ALL TO anon USING (true) WITH CHECK (true);

-- Un periodo cerrado no puede volver a modificarse
CREATE OR REPLACE FUNCTION public.conciliacion_bloquear_cerrado()
RETURNS trigger AS $$
BEGIN
  IF OLD.estado = 'cerrado' THEN
    RAISE EXCEPTION 'La conciliación % ya está cerrada y es irreversible', OLD.numero;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conciliacion_bloquear_cerrado ON public.conciliaciones_bancarias;
CREATE TRIGGER trg_conciliacion_bloquear_cerrado
  BEFORE UPDATE ON public.conciliaciones_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.conciliacion_bloquear_cerrado();
