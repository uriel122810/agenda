-- ==============================================================================
-- PAZSUMA - ESQUEMA INTEGRAL CRUD Y AUDITORÍA EN SUPABASE
-- Incluye: historial_operaciones, ingresos, gastos, contactos, inventario,
-- cuentas_bancarias, polizas y colaboradores
-- ==============================================================================

-- 1. TABLA: HISTORIAL DE OPERACIONES Y AUDITORÍA
CREATE TABLE IF NOT EXISTS public.historial_operaciones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario text NOT NULL,
  user_name text,
  user_email text,
  modulo text NOT NULL,
  accion text NOT NULL,
  detalles text,
  ip_origen text DEFAULT '189.240.12.94 • CDMX',
  estatus text NOT NULL DEFAULT 'completado',
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_created_at ON public.historial_operaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_modulo ON public.historial_operaciones (modulo);
CREATE INDEX IF NOT EXISTS idx_historial_usuario ON public.historial_operaciones (usuario);

ALTER TABLE public.historial_operaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "historial_all_auth" ON public.historial_operaciones;
CREATE POLICY "historial_all_auth" ON public.historial_operaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "historial_all_anon" ON public.historial_operaciones;
CREATE POLICY "historial_all_anon" ON public.historial_operaciones FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. TABLA: INGRESOS Y FACTURACIÓN
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
DROP POLICY IF EXISTS "ingresos_all_auth" ON public.ingresos;
CREATE POLICY "ingresos_all_auth" ON public.ingresos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ingresos_all_anon" ON public.ingresos;
CREATE POLICY "ingresos_all_anon" ON public.ingresos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. TABLA: GASTOS Y EGRESOS
CREATE TABLE IF NOT EXISTS public.gastos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folio text NOT NULL,
  proveedor text NOT NULL,
  categoria text NOT NULL,
  fecha timestamp with time zone DEFAULT now(),
  total numeric NOT NULL DEFAULT 0.00,
  estado text NOT NULL DEFAULT 'Pagado' CHECK (estado IN ('Pagado', 'Por pagar', 'En revisión')),
  metodo_pago text DEFAULT 'Transferencia BBVA',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gastos_all_auth" ON public.gastos;
CREATE POLICY "gastos_all_auth" ON public.gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "gastos_all_anon" ON public.gastos;
CREATE POLICY "gastos_all_anon" ON public.gastos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. TABLA: CONTACTOS Y PADRÓN DE CONTRIBUYENTES
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
DROP POLICY IF EXISTS "contactos_all_auth" ON public.contactos;
CREATE POLICY "contactos_all_auth" ON public.contactos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "contactos_all_anon" ON public.contactos;
CREATE POLICY "contactos_all_anon" ON public.contactos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. TABLA: INVENTARIO DE BIENES Y SERVICIOS
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
DROP POLICY IF EXISTS "inventario_all_auth" ON public.inventario;
CREATE POLICY "inventario_all_auth" ON public.inventario FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "inventario_all_anon" ON public.inventario;
CREATE POLICY "inventario_all_anon" ON public.inventario FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. TABLA: CUENTAS BANCARIAS Y FONDOS
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
DROP POLICY IF EXISTS "cuentas_bancarias_all_auth" ON public.cuentas_bancarias;
CREATE POLICY "cuentas_bancarias_all_auth" ON public.cuentas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "cuentas_bancarias_all_anon" ON public.cuentas_bancarias;
CREATE POLICY "cuentas_bancarias_all_anon" ON public.cuentas_bancarias FOR ALL TO anon USING (true) WITH CHECK (true);

-- 7. TABLA: PÓLIZAS CONTABLES
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
DROP POLICY IF EXISTS "polizas_all_auth" ON public.polizas;
CREATE POLICY "polizas_all_auth" ON public.polizas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "polizas_all_anon" ON public.polizas;
CREATE POLICY "polizas_all_anon" ON public.polizas FOR ALL TO anon USING (true) WITH CHECK (true);

-- 8. TABLA: COLABORADORES Y EQUIPO DE TRABAJO
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'Auxiliar Contable' CHECK (role IN ('Administrador', 'Contador Senior', 'Auxiliar Contable', 'Auditor')),
  status text NOT NULL DEFAULT 'Aceptada' CHECK (status IN ('Aceptada', 'Pendiente', 'Expirada')),
  invitations_count integer NOT NULL DEFAULT 1,
  assigned_clients_count integer NOT NULL DEFAULT 0,
  joined_date text DEFAULT 'Hoy',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "colaboradores_all_auth" ON public.colaboradores;
CREATE POLICY "colaboradores_all_auth" ON public.colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "colaboradores_all_anon" ON public.colaboradores;
CREATE POLICY "colaboradores_all_anon" ON public.colaboradores FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- SEMILLAS INICIALES INSTITUCIONALES (Si las tablas están vacías)
-- ==============================================================================

-- Contactos iniciales
INSERT INTO public.contactos (nombre, rfc, tipo, telefono, email, saldo)
VALUES
  ('Comercializadora Nacional SA de CV', 'XAXX010101000', 'Cliente', '+52 55 1234-5678', 'factura@nacional.com', 0.00),
  ('Paula López Delgado', 'EADM910204AB1', 'Cliente', '+52 55 9876-5432', 'paula@gmail.com', 0.00),
  ('Arrendadora de Inmuebles SA', 'AIN090101XYZ', 'Proveedor', '+52 55 2222-3333', 'cobranza@inmuebles.com', 0.00)
ON CONFLICT DO NOTHING;

-- Inventario inicial
INSERT INTO public.inventario (codigo, nombre, clave_sat, precio, costo, existencia, categoria)
VALUES
  ('SRV-01', 'Asesoría Contable Mensual Institucional', '84111500', 4500.00, 0.00, 'Servicio', 'Servicios Profesionales'),
  ('SRV-02', 'Auditoría Fiscal y Dictamen PazSuma', '84111506', 18000.00, 0.00, 'Servicio', 'Auditoría y Fiscal'),
  ('LBN-01', 'Libro de Actas y Hojas Foliadas', '44101700', 1200.00, 450.00, '48 unidades', 'Papelería Oficial')
ON CONFLICT (codigo) DO NOTHING;

-- Cuentas Bancarias iniciales
INSERT INTO public.cuentas_bancarias (banco, numero_cuenta, clabe, moneda, saldo_libros, saldo_banco, estatus)
VALUES
  ('BBVA México', '•••• 4912 (CLABE: 012180004912389102)', '012180004912389102', 'MXN', 245890.12, 245890.12, 'Conciliado'),
  ('Santander México', '•••• 8821 (CLABE: 014180008821948201)', '014180008821948201', 'MXN', 112450.00, 112450.00, 'Conciliado'),
  ('Caja Chica Despacho', 'Fondo Fijo Operativo', 'N/A', 'MXN', 5000.00, 5000.00, 'Cuadrado')
ON CONFLICT DO NOTHING;

-- Pólizas iniciales
INSERT INTO public.polizas (numero_poliza, tipo, concepto, total_debe, total_haber, cuadre)
VALUES
  ('POL-ING-042', 'Ingresos', 'Cobro de factura FOL-0104 transferencia BBVA', 52200.00, 52200.00, 'Cuadrada'),
  ('POL-EGR-019', 'Egresos', 'Pago de arrendamiento de oficinas PazSuma', 25000.00, 25000.00, 'Cuadrada'),
  ('POL-DIA-088', 'Diario', 'Provisión mensual de impuestos y retenciones', 14350.00, 14350.00, 'Cuadrada')
ON CONFLICT (numero_poliza) DO NOTHING;

-- Gastos iniciales
INSERT INTO public.gastos (folio, proveedor, categoria, total, estado, metodo_pago)
VALUES
  ('CFDI-8821', 'Arrendadora de Inmuebles SA', 'Arrendamiento de Oficinas', 25000.00, 'Pagado', 'Transferencia BBVA'),
  ('GAS-3390', 'Comisión Federal de Electricidad', 'Servicios Públicos', 8750.00, 'Pagado', 'Transferencia BBVA'),
  ('PROV-1102', 'Papelería y Suministros MX', 'Materiales y Útiles de Oficina', 14500.00, 'Por pagar', 'Crédito 15 días')
ON CONFLICT DO NOTHING;

-- Ingresos iniciales
INSERT INTO public.ingresos (folio, cliente, subtotal, iva, total, estado)
VALUES
  ('FOL-0104', 'Distribuidora Logística de México', 45000.00, 7200.00, 52200.00, 'Cobrada'),
  ('FOL-0105', 'Paula López Delgado', 18500.00, 2960.00, 21460.00, 'Cobrada'),
  ('FOL-0106', 'Servicios Industriales SA', 27672.41, 4427.59, 32100.00, 'Pendiente')
ON CONFLICT DO NOTHING;

-- Colaboradores iniciales
INSERT INTO public.colaboradores (name, email, role, status, invitations_count, assigned_clients_count, joined_date)
VALUES
  ('Uriel Gómez (Tú)', 'uriel@pazsuma.com', 'Administrador', 'Aceptada', 1, 40, '01 Ene 2026'),
  ('Ana Martínez', 'ana.martinez@pazsuma.com', 'Contador Senior', 'Aceptada', 1, 25, '15 Feb 2026'),
  ('Carlos Ruiz Solís', 'carlos.ruiz@pazsuma.com', 'Auxiliar Contable', 'Aceptada', 2, 15, '10 Mar 2026'),
  ('Mariana Vega', 'mariana.vega@consultores.mx', 'Auditor', 'Pendiente', 1, 0, 'Invitado ayer')
ON CONFLICT DO NOTHING;
