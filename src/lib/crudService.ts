/**
 * PazSuma - Servicio Unificado de Gestión de Registros CRUD
 * Conecta las operaciones de Contactos, Inventario, Bancos, Pólizas, Gastos e Ingresos
 * con Supabase y respaldo de persistencia reactiva.
 */

import { createSupabaseBrowserClient } from './supabase/client';

export interface ContactoRecord {
  id: string;
  nombre: string;
  rfc: string;
  tipo: 'Cliente' | 'Proveedor' | 'Colaborador';
  telefono: string;
  email: string;
  saldo: string;
  created_at?: string;
}

export interface InventarioRecord {
  id: string;
  codigo: string;
  nombre: string;
  clave_sat: string;
  precio: string;
  costo: string;
  existencia: string;
  created_at?: string;
}

export interface CuentaBancariaRecord {
  id: string;
  banco: string;
  numero_cuenta: string;
  clabe?: string;
  moneda: string;
  saldo_libros: string;
  saldo_banco: string;
  estatus: string;
  created_at?: string;
}

export interface PolizaRecord {
  id: string;
  numero_poliza: string;
  tipo: 'Ingresos' | 'Egresos' | 'Diario';
  fecha: string;
  concepto: string;
  total_debe: string;
  total_haber: string;
  cuadre: string;
  created_at?: string;
}

export interface GastoRecord {
  id: string;
  folio: string;
  proveedor: string;
  categoria: string;
  fecha: string;
  total: string;
  estado: 'Pagado' | 'Por pagar' | 'En revisión';
  metodo_pago?: string;
  created_at?: string;
}

export interface IngresoRecord {
  id: string;
  folio: string;
  cliente: string;
  fecha: string;
  subtotal: string;
  iva: string;
  total: string;
  estado: 'Cobrada' | 'Pendiente' | 'Cancelada';
  created_at?: string;
}

// Semillas iniciales institucionales de PazSuma
export const DEFAULT_CONTACTOS: ContactoRecord[] = [
  {
    id: 'cont-1',
    nombre: 'Comercializadora Nacional SA de CV',
    rfc: 'XAXX010101000',
    tipo: 'Cliente',
    telefono: '+52 55 1234-5678',
    email: 'factura@nacional.com',
    saldo: '$0.00'
  },
  {
    id: 'cont-2',
    nombre: 'Paula López Delgado',
    rfc: 'EADM910204AB1',
    tipo: 'Cliente',
    telefono: '+52 55 9876-5432',
    email: 'paula@gmail.com',
    saldo: '$0.00'
  },
  {
    id: 'cont-3',
    nombre: 'Arrendadora de Inmuebles SA',
    rfc: 'AIN090101XYZ',
    tipo: 'Proveedor',
    telefono: '+52 55 2222-3333',
    email: 'cobranza@inmuebles.com',
    saldo: '$0.00'
  }
];

export const DEFAULT_INVENTARIO: InventarioRecord[] = [
  {
    id: 'inv-1',
    codigo: 'SRV-01',
    nombre: 'Asesoría Contable Mensual Institucional',
    clave_sat: '84111500',
    precio: '$4,500.00',
    costo: '$0.00',
    existencia: 'Servicio'
  },
  {
    id: 'inv-2',
    codigo: 'SRV-02',
    nombre: 'Auditoría Fiscal y Dictamen PazSuma',
    clave_sat: '84111506',
    precio: '$18,000.00',
    costo: '$0.00',
    existencia: 'Servicio'
  },
  {
    id: 'inv-3',
    codigo: 'LBN-01',
    nombre: 'Libro de Actas y Hojas Foliadas',
    clave_sat: '44101700',
    precio: '$1,200.00',
    costo: '$450.00',
    existencia: '48 unidades'
  }
];

export const DEFAULT_BANCOS: CuentaBancariaRecord[] = [
  {
    id: 'ban-1',
    banco: 'BBVA México',
    numero_cuenta: '•••• 4912 (CLABE: 012180004912389102)',
    clabe: '012180004912389102',
    moneda: 'MXN',
    saldo_libros: '$245,890.12',
    saldo_banco: '$245,890.12',
    estatus: 'Conciliado'
  },
  {
    id: 'ban-2',
    banco: 'Santander México',
    numero_cuenta: '•••• 8821 (CLABE: 014180008821948201)',
    clabe: '014180008821948201',
    moneda: 'MXN',
    saldo_libros: '$112,450.00',
    saldo_banco: '$112,450.00',
    estatus: 'Conciliado'
  },
  {
    id: 'ban-3',
    banco: 'Caja Chica Despacho',
    numero_cuenta: 'Fondo Fijo Operativo',
    clabe: 'N/A',
    moneda: 'MXN',
    saldo_libros: '$5,000.00',
    saldo_banco: '$5,000.00',
    estatus: 'Cuadrado'
  }
];

export const DEFAULT_POLIZAS: PolizaRecord[] = [
  {
    id: 'pol-1',
    numero_poliza: 'POL-ING-042',
    tipo: 'Ingresos',
    fecha: '20 Sep 2026',
    concepto: 'Cobro de factura FOL-0104 transferencia BBVA',
    total_debe: '$52,200.00',
    total_haber: '$52,200.00',
    cuadre: 'Cuadrada'
  },
  {
    id: 'pol-2',
    numero_poliza: 'POL-EGR-019',
    tipo: 'Egresos',
    fecha: '18 Sep 2026',
    concepto: 'Pago de arrendamiento de oficinas PazSuma',
    total_debe: '$25,000.00',
    total_haber: '$25,000.00',
    cuadre: 'Cuadrada'
  },
  {
    id: 'pol-3',
    numero_poliza: 'POL-DIA-088',
    tipo: 'Diario',
    fecha: '15 Sep 2026',
    concepto: 'Provisión mensual de impuestos y retenciones',
    total_debe: '$14,350.00',
    total_haber: '$14,350.00',
    cuadre: 'Cuadrada'
  }
];

export const DEFAULT_GASTOS: GastoRecord[] = [
  {
    id: 'gas-1',
    folio: 'CFDI-8821',
    proveedor: 'Arrendadora de Inmuebles SA',
    categoria: 'Arrendamiento de Oficinas',
    fecha: '05 Sep 2026',
    total: '$25,000.00',
    estado: 'Pagado',
    metodo_pago: 'Transferencia BBVA'
  },
  {
    id: 'gas-2',
    folio: 'GAS-3390',
    proveedor: 'Comisión Federal de Electricidad',
    categoria: 'Servicios Públicos',
    fecha: '12 Sep 2026',
    total: '$8,750.00',
    estado: 'Pagado',
    metodo_pago: 'Transferencia BBVA'
  },
  {
    id: 'gas-3',
    folio: 'PROV-1102',
    proveedor: 'Papelería y Suministros MX',
    categoria: 'Materiales y Útiles de Oficina',
    fecha: '18 Sep 2026',
    total: '$14,500.00',
    estado: 'Por pagar',
    metodo_pago: 'Crédito 15 días'
  }
];

export const DEFAULT_INGRESOS: IngresoRecord[] = [
  {
    id: 'ing-1',
    folio: 'FOL-0104',
    cliente: 'Distribuidora Logística de México',
    fecha: '18 Sep 2026',
    subtotal: '$45,000.00',
    iva: '$7,200.00',
    total: '$52,200.00',
    estado: 'Cobrada'
  },
  {
    id: 'ing-2',
    folio: 'FOL-0105',
    cliente: 'Paula López Delgado',
    fecha: '19 Sep 2026',
    subtotal: '$18,500.00',
    iva: '$2,960.00',
    total: '$21,460.00',
    estado: 'Cobrada'
  },
  {
    id: 'ing-3',
    folio: 'FOL-0106',
    cliente: 'Servicios Industriales SA',
    fecha: '20 Sep 2026',
    subtotal: '$27,672.41',
    iva: '$4,427.59',
    total: '$32,100.00',
    estado: 'Pendiente'
  }
];

// ── Helpers de Persistencia Local y Supabase ─────────────────────────────

function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(`pazsuma_crud_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`pazsuma_crud_${key}`, JSON.stringify(val));
  } catch (err) {
    console.warn('Error saving to localStorage:', err);
  }
}

// ── Métodos para CONTACTOS ───────────────────────────────────────────────

export async function fetchContactos(): Promise<ContactoRecord[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('contactos').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        nombre: d.nombre,
        rfc: d.rfc,
        tipo: d.tipo || 'Cliente',
        telefono: d.telefono || '',
        email: d.email || '',
        saldo: typeof d.saldo === 'number' ? `$${d.saldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : (d.saldo || '$0.00')
      }));
    }
  } catch (err) {
    // Si la tabla no existe en la base remota aún, se recupera el estado local
  }
  return getStored<ContactoRecord[]>('contactos', DEFAULT_CONTACTOS);
}

export async function saveContacto(item: Omit<ContactoRecord, 'id'>): Promise<ContactoRecord> {
  const newRecord: ContactoRecord = {
    ...item,
    id: `cont-${Date.now()}`
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const numericSaldo = parseFloat(item.saldo.replace(/[^0-9.-]/g, '')) || 0;
    await supabase.from('contactos').insert({
      nombre: item.nombre,
      rfc: item.rfc,
      tipo: item.tipo,
      telefono: item.telefono,
      email: item.email,
      saldo: numericSaldo
    });
  } catch (err) {
    console.warn('Supabase insert fallback:', err);
  }

  const current = getStored<ContactoRecord[]>('contactos', DEFAULT_CONTACTOS);
  const updated = [newRecord, ...current];
  setStored('contactos', updated);
  return newRecord;
}

// ── Métodos para INVENTARIO ──────────────────────────────────────────────

export async function fetchInventario(): Promise<InventarioRecord[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('inventario').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        codigo: d.codigo,
        nombre: d.nombre,
        clave_sat: d.clave_sat,
        precio: typeof d.precio === 'number' ? `$${d.precio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.precio,
        costo: typeof d.costo === 'number' ? `$${d.costo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.costo,
        existencia: d.existencia || 'Servicio'
      }));
    }
  } catch (err) {
    // Fallback local
  }
  return getStored<InventarioRecord[]>('inventario', DEFAULT_INVENTARIO);
}

export async function saveInventarioItem(item: Omit<InventarioRecord, 'id'>): Promise<InventarioRecord> {
  const newRecord: InventarioRecord = {
    ...item,
    id: `inv-${Date.now()}`
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const numPrecio = parseFloat(item.precio.replace(/[^0-9.-]/g, '')) || 0;
    const numCosto = parseFloat(item.costo.replace(/[^0-9.-]/g, '')) || 0;
    await supabase.from('inventario').insert({
      codigo: item.codigo,
      nombre: item.nombre,
      clave_sat: item.clave_sat,
      precio: numPrecio,
      costo: numCosto,
      existencia: item.existencia
    });
  } catch (err) {
    console.warn('Supabase insert fallback:', err);
  }

  const current = getStored<InventarioRecord[]>('inventario', DEFAULT_INVENTARIO);
  const updated = [newRecord, ...current];
  setStored('inventario', updated);
  return newRecord;
}

// ── Métodos para BANCOS ──────────────────────────────────────────────────

export async function fetchBancos(): Promise<CuentaBancariaRecord[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('cuentas_bancarias').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        banco: d.banco,
        numero_cuenta: d.numero_cuenta,
        clabe: d.clabe || 'N/A',
        moneda: d.moneda || 'MXN',
        saldo_libros: typeof d.saldo_libros === 'number' ? `$${d.saldo_libros.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.saldo_libros,
        saldo_banco: typeof d.saldo_banco === 'number' ? `$${d.saldo_banco.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.saldo_banco,
        estatus: d.estatus || 'Conciliado'
      }));
    }
  } catch (err) {
    // Fallback local
  }
  return getStored<CuentaBancariaRecord[]>('bancos', DEFAULT_BANCOS);
}

export async function saveCuentaBancaria(item: Omit<CuentaBancariaRecord, 'id'>): Promise<CuentaBancariaRecord> {
  const newRecord: CuentaBancariaRecord = {
    ...item,
    id: `ban-${Date.now()}`
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const numLibros = parseFloat(item.saldo_libros.replace(/[^0-9.-]/g, '')) || 0;
    const numBanco = parseFloat(item.saldo_banco.replace(/[^0-9.-]/g, '')) || 0;
    await supabase.from('cuentas_bancarias').insert({
      banco: item.banco,
      numero_cuenta: item.numero_cuenta,
      clabe: item.clabe,
      moneda: item.moneda,
      saldo_libros: numLibros,
      saldo_banco: numBanco,
      estatus: item.estatus
    });
  } catch (err) {
    console.warn('Supabase insert fallback:', err);
  }

  const current = getStored<CuentaBancariaRecord[]>('bancos', DEFAULT_BANCOS);
  const updated = [newRecord, ...current];
  setStored('bancos', updated);
  return newRecord;
}

// ── Métodos para PÓLIZAS CONTABLES ───────────────────────────────────────

export async function fetchPolizas(): Promise<PolizaRecord[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('polizas').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        numero_poliza: d.numero_poliza,
        tipo: d.tipo,
        fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy',
        concepto: d.concepto,
        total_debe: typeof d.total_debe === 'number' ? `$${d.total_debe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.total_debe,
        total_haber: typeof d.total_haber === 'number' ? `$${d.total_haber.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.total_haber,
        cuadre: d.cuadre || 'Cuadrada'
      }));
    }
  } catch (err) {
    // Fallback local
  }
  return getStored<PolizaRecord[]>('polizas', DEFAULT_POLIZAS);
}

export async function savePoliza(item: Omit<PolizaRecord, 'id'>): Promise<PolizaRecord> {
  const newRecord: PolizaRecord = {
    ...item,
    id: `pol-${Date.now()}`
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const numDebe = parseFloat(item.total_debe.replace(/[^0-9.-]/g, '')) || 0;
    const numHaber = parseFloat(item.total_haber.replace(/[^0-9.-]/g, '')) || 0;
    await supabase.from('polizas').insert({
      numero_poliza: item.numero_poliza,
      tipo: item.tipo,
      concepto: item.concepto,
      total_debe: numDebe,
      total_haber: numHaber,
      cuadre: item.cuadre
    });
  } catch (err) {
    console.warn('Supabase insert fallback:', err);
  }

  const current = getStored<PolizaRecord[]>('polizas', DEFAULT_POLIZAS);
  const updated = [newRecord, ...current];
  setStored('polizas', updated);
  return newRecord;
}

// ── Métodos para GASTOS / EGRESOS ────────────────────────────────────────

export async function fetchGastos(): Promise<GastoRecord[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('gastos').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        folio: d.folio,
        proveedor: d.proveedor,
        categoria: d.categoria,
        fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy',
        total: typeof d.total === 'number' ? `$${d.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.total,
        estado: d.estado || 'Pagado',
        metodo_pago: d.metodo_pago || 'Transferencia'
      }));
    }
  } catch (err) {
    // Fallback local
  }
  return getStored<GastoRecord[]>('gastos', DEFAULT_GASTOS);
}

export async function saveGasto(item: Omit<GastoRecord, 'id'>): Promise<GastoRecord> {
  const newRecord: GastoRecord = {
    ...item,
    id: `gas-${Date.now()}`
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const numTotal = parseFloat(item.total.replace(/[^0-9.-]/g, '')) || 0;
    await supabase.from('gastos').insert({
      folio: item.folio,
      proveedor: item.proveedor,
      categoria: item.categoria,
      total: numTotal,
      estado: item.estado,
      metodo_pago: item.metodo_pago
    });
  } catch (err) {
    console.warn('Supabase insert fallback:', err);
  }

  const current = getStored<GastoRecord[]>('gastos', DEFAULT_GASTOS);
  const updated = [newRecord, ...current];
  setStored('gastos', updated);
  return newRecord;
}

// ── Métodos para INGRESOS ────────────────────────────────────────────────

export async function fetchIngresos(): Promise<IngresoRecord[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('ingresos').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map(d => ({
        id: d.id,
        folio: d.folio,
        cliente: d.cliente,
        fecha: d.fecha ? new Date(d.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Hoy',
        subtotal: typeof d.subtotal === 'number' ? `$${d.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.subtotal,
        iva: typeof d.iva === 'number' ? `$${d.iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.iva,
        total: typeof d.total === 'number' ? `$${d.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : d.total,
        estado: d.estado || 'Cobrada'
      }));
    }
  } catch (err) {
    // Fallback local
  }
  return getStored<IngresoRecord[]>('ingresos', DEFAULT_INGRESOS);
}

export async function saveIngreso(item: Omit<IngresoRecord, 'id'>): Promise<IngresoRecord> {
  const newRecord: IngresoRecord = {
    ...item,
    id: `ing-${Date.now()}`
  };

  try {
    const supabase = createSupabaseBrowserClient();
    const numSubtotal = parseFloat(item.subtotal.replace(/[^0-9.-]/g, '')) || 0;
    const numIva = parseFloat(item.iva.replace(/[^0-9.-]/g, '')) || 0;
    const numTotal = parseFloat(item.total.replace(/[^0-9.-]/g, '')) || 0;
    await supabase.from('ingresos').insert({
      folio: item.folio,
      cliente: item.cliente,
      subtotal: numSubtotal,
      iva: numIva,
      total: numTotal,
      estado: item.estado
    });
  } catch (err) {
    console.warn('Supabase insert fallback:', err);
  }

  const current = getStored<IngresoRecord[]>('ingresos', DEFAULT_INGRESOS);
  const updated = [newRecord, ...current];
  setStored('ingresos', updated);
  return newRecord;
}
