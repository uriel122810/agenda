-- ==============================================================================
-- PAZSUMA - ESQUEMA INTEGRAL CRUD: CONTACTOS, INVENTARIO, BANCOS, PÓLIZAS, GASTOS E INGRESOS
-- ==============================================================================

-- 1. TABLA: CONTACTOS Y CONTRIBUYENTES
CREATE TABLE IF NOT EXISTS public.contactos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  rfc text NOT NULL,
  tipo text NOT NULL DEFAULT 'Cliente' CHECK (tipo IN ('Cliente', 'Proveedor', 'Colaborador')),
  telefono text,
  email text,
  saldo numeric NOT NULL DEFAULT 0.00,
  notas text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.contactos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contactos_all" ON public.contactos;
CREATE POLICY "contactos_all" ON public.contactos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "contactos_anon_all" ON public.contactos;
CREATE POLICY "contactos_anon_all" ON public.contactos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. TABLA: INVENTARIO DE BIENES Y SERVICIOS
CREATE TABLE IF NOT EXISTS public.inventario (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  clave_sat text NOT NULL DEFAULT '84111500',
  precio numeric NOT NULL DEFAULT 0.00,
  costo numeric NOT NULL DEFAULT 0.00,
  existencia text NOT NULL DEFAULT 'Servicio',
  categoria text DEFAULT 'Servicios Profesionales',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventario_all" ON public.inventario;
CREATE POLICY "inventario_all" ON public.inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inventario_anon_all" ON public.inventario;
CREATE POLICY "inventario_anon_all" ON public.inventario FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. TABLA: CUENTAS BANCARIAS Y FONDOS
CREATE TABLE IF NOT EXISTS public.cuentas_bancarias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  banco text NOT NULL,
  numero_cuenta text NOT NULL,
  clabe text,
  moneda text NOT NULL DEFAULT 'MXN',
  saldo_libros numeric NOT NULL DEFAULT 0.00,
  saldo_banco numeric NOT NULL DEFAULT 0.00,
  estatus text NOT NULL DEFAULT 'Conciliado',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.cuentas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cuentas_bancarias_all" ON public.cuentas_bancarias;
CREATE POLICY "cuentas_bancarias_all" ON public.cuentas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cuentas_bancarias_anon_all" ON public.cuentas_bancarias;
CREATE POLICY "cuentas_bancarias_anon_all" ON public.cuentas_bancarias FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. TABLA: PÓLIZAS CONTABLES
CREATE TABLE IF NOT EXISTS public.polizas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_poliza text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'Diario' CHECK (tipo IN ('Ingresos', 'Egresos', 'Diario')),
  fecha timestamp with time zone DEFAULT now(),
  concepto text NOT NULL,
  total_debe numeric NOT NULL DEFAULT 0.00,
  total_haber numeric NOT NULL DEFAULT 0.00,
  cuadre text NOT NULL DEFAULT 'Cuadrada',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.polizas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "polizas_all" ON public.polizas;
CREATE POLICY "polizas_all" ON public.polizas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "polizas_anon_all" ON public.polizas;
CREATE POLICY "polizas_anon_all" ON public.polizas FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. TABLA: GASTOS Y EGRESOS
CREATE TABLE IF NOT EXISTS public.gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folio text NOT NULL,
  proveedor text NOT NULL,
  categoria text NOT NULL,
  fecha timestamp with time zone DEFAULT now(),
  total numeric NOT NULL DEFAULT 0.00,
  estado text NOT NULL DEFAULT 'Pagado' CHECK (estado IN ('Pagado', 'Por pagar', 'En revisión')),
  metodo_pago text DEFAULT 'Transferencia Electrónica',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gastos_all" ON public.gastos;
CREATE POLICY "gastos_all" ON public.gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "gastos_anon_all" ON public.gastos;
CREATE POLICY "gastos_anon_all" ON public.gastos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. TABLA: INGRESOS Y FACTURAS
CREATE TABLE IF NOT EXISTS public.ingresos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folio text NOT NULL,
  cliente text NOT NULL,
  fecha timestamp with time zone DEFAULT now(),
  subtotal numeric NOT NULL DEFAULT 0.00,
  iva numeric NOT NULL DEFAULT 0.00,
  total numeric NOT NULL DEFAULT 0.00,
  estado text NOT NULL DEFAULT 'Cobrada' CHECK (estado IN ('Cobrada', 'Pendiente', 'Cancelada')),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ingresos_all" ON public.ingresos;
CREATE POLICY "ingresos_all" ON public.ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ingresos_anon_all" ON public.ingresos;
CREATE POLICY "ingresos_anon_all" ON public.ingresos FOR ALL TO anon USING (true) WITH CHECK (true);
