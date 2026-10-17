/**
 * PazSuma - Motor de Conciliación Bancaria
 *
 * Lógica pura (sin React ni Supabase) para:
 *  - Conciliar movimientos de Libros contra el Estado de Cuenta (Banco)
 *    de forma automática (por criterios) o manual (selección 1..n vs 1..n).
 *  - Calcular totales de seguimiento (suma, conciliado, pendiente).
 *  - Construir el Reporte General y el Reporte Detallado.
 *  - Procesar (cerrar) un periodo: arrastra los no conciliados al siguiente
 *    periodo y deja el periodo cerrado como histórico inmutable.
 *
 * Convención de montos (ambos lados se normalizan a "depósito" / "retiro"):
 *  - Libros: depósito = CARGO a la cuenta de bancos, retiro = ABONO.
 *  - Banco:  depósito = ABONO del estado de cuenta, retiro = CARGO.
 */

export type Origen = 'libros' | 'banco';

export interface Movimiento {
  id: string;
  origen: Origen;
  fecha: string; // YYYY-MM-DD
  concepto: string;
  referencia: string;
  deposito: number;
  retiro: number;
  /** Id del grupo de conciliación al que pertenece (null = pendiente) */
  conciliacionId: string | null;
  /** true si viene de un periodo anterior (ya afectó el saldo de ese periodo) */
  arrastrado: boolean;
  /** Número de conciliación donde se originó */
  periodoOrigen: number;
}

export interface GrupoConciliacion {
  id: string;
  librosIds: string[];
  bancoIds: string[];
  tipo: 'automatica' | 'manual';
  fecha: string; // ISO
}

export interface CriteriosConciliacion {
  /** Días de tolerancia entre fecha de libros y fecha de banco */
  toleranciaDias: number;
  /** Diferencia máxima permitida en el importe */
  toleranciaImporte: number;
  /** Exigir que coincida la referencia (REF-xxxx) */
  exigirReferencia: boolean;
}

export const CRITERIOS_DEFAULT: CriteriosConciliacion = {
  toleranciaDias: 5,
  toleranciaImporte: 0,
  exigirReferencia: false
};

export interface ResumenCierre {
  saldoFinalLibros: number;
  saldoFinalBanco: number;
  conciliados: number;
  pendientesArrastrados: number;
  fechaCierre: string;
}

export interface PeriodoConciliacion {
  id: string;
  cuentaId: string;
  empresa: string;
  banco: string;
  cuenta: string;
  numero: number;
  /** Fecha de corte YYYY-MM-DD */
  fechaCorte: string;
  saldoInicialLibros: number;
  saldoInicialBanco: number;
  estado: 'abierto' | 'cerrado';
  movimientos: Movimiento[];
  grupos: GrupoConciliacion[];
  criterios: CriteriosConciliacion;
  cierre?: ResumenCierre;
  created_at: string;
}

// ── Utilidades ────────────────────────────────────────────────────────────────

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const neto = (m: Pick<Movimiento, 'deposito' | 'retiro'>) => round2(m.deposito - m.retiro);

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombrePeriodo(fechaCorte: string): string {
  const [y, m] = fechaCorte.split('-').map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}

export function formatFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return d && m && y ? `${d}/${m}/${y}` : fecha;
}

export function formatMoneda(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diasEntre(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

/** Extrae la primera referencia tipo REF-12345 o el texto de referencia explícito */
function claveReferencia(m: Movimiento): string {
  const src = `${m.referencia} ${m.concepto}`.toUpperCase();
  const match = src.match(/REF[-\s]?([A-Z0-9]+)/);
  if (match) return match[1];
  return m.referencia.trim().toUpperCase();
}

/** Último día del mes siguiente a la fecha de corte */
export function siguienteFechaCorte(fechaCorte: string): string {
  const [y, m] = fechaCorte.split('-').map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)); // m es 1-based → mes siguiente, día 0 = último del mes
  return last.toISOString().slice(0, 10);
}

// ── Creación ──────────────────────────────────────────────────────────────────

export function crearPeriodo(params: {
  cuentaId: string;
  empresa: string;
  banco: string;
  cuenta: string;
  fechaCorte: string;
  saldoInicialLibros: number;
  saldoInicialBanco: number;
  numero?: number;
  movimientos?: Movimiento[];
  criterios?: CriteriosConciliacion;
}): PeriodoConciliacion {
  return {
    id: uid('conc'),
    cuentaId: params.cuentaId,
    empresa: params.empresa,
    banco: params.banco,
    cuenta: params.cuenta,
    numero: params.numero ?? 1,
    fechaCorte: params.fechaCorte,
    saldoInicialLibros: round2(params.saldoInicialLibros),
    saldoInicialBanco: round2(params.saldoInicialBanco),
    estado: 'abierto',
    movimientos: params.movimientos ?? [],
    grupos: [],
    criterios: params.criterios ?? { ...CRITERIOS_DEFAULT },
    created_at: new Date().toISOString()
  };
}

export function nuevoMovimiento(
  origen: Origen,
  data: { fecha: string; concepto: string; referencia?: string; deposito?: number; retiro?: number },
  periodoOrigen: number
): Movimiento {
  return {
    id: uid(origen === 'libros' ? 'lib' : 'ban'),
    origen,
    fecha: data.fecha,
    concepto: data.concepto.trim(),
    referencia: (data.referencia ?? '').trim(),
    deposito: round2(Math.abs(data.deposito ?? 0)),
    retiro: round2(Math.abs(data.retiro ?? 0)),
    conciliacionId: null,
    arrastrado: false,
    periodoOrigen
  };
}

// ── Conciliación ──────────────────────────────────────────────────────────────

function assertAbierto(p: PeriodoConciliacion) {
  if (p.estado !== 'abierto') throw new Error('El periodo está cerrado y no puede modificarse.');
}

/**
 * Conciliación manual: N movimientos de libros contra M del banco.
 * La suma neta de ambos lados debe coincidir (con tolerancia de importe).
 */
export function conciliarManual(
  p: PeriodoConciliacion,
  librosIds: string[],
  bancoIds: string[]
): PeriodoConciliacion {
  assertAbierto(p);
  if (librosIds.length === 0 || bancoIds.length === 0) {
    throw new Error('Selecciona al menos un movimiento de Libros y uno de Banco.');
  }
  const byId = new Map(p.movimientos.map(m => [m.id, m]));
  const libros = librosIds.map(id => byId.get(id));
  const banco = bancoIds.map(id => byId.get(id));
  if (libros.some(m => !m || m.origen !== 'libros') || banco.some(m => !m || m.origen !== 'banco')) {
    throw new Error('Selección inválida.');
  }
  if ([...libros, ...banco].some(m => m!.conciliacionId)) {
    throw new Error('Alguno de los movimientos ya está conciliado.');
  }
  const sumL = round2(libros.reduce((a, m) => a + neto(m!), 0));
  const sumB = round2(banco.reduce((a, m) => a + neto(m!), 0));
  if (Math.abs(sumL - sumB) > p.criterios.toleranciaImporte + 0.001) {
    throw new Error(
      `Los importes no cuadran: Libros ${formatMoneda(sumL)} vs Banco ${formatMoneda(sumB)} (diferencia ${formatMoneda(round2(sumL - sumB))}).`
    );
  }
  const grupo: GrupoConciliacion = {
    id: uid('grp'),
    librosIds: [...librosIds],
    bancoIds: [...bancoIds],
    tipo: 'manual',
    fecha: new Date().toISOString()
  };
  const ids = new Set([...librosIds, ...bancoIds]);
  return {
    ...p,
    grupos: [...p.grupos, grupo],
    movimientos: p.movimientos.map(m => (ids.has(m.id) ? { ...m, conciliacionId: grupo.id } : m))
  };
}

/**
 * Conciliación automática 1 a 1 según criterios.
 * Prioridad: (1) misma referencia + importe, (2) importe y fecha más cercana.
 */
export function conciliarAutomatico(p: PeriodoConciliacion): { periodo: PeriodoConciliacion; nuevos: number } {
  assertAbierto(p);
  const { toleranciaDias, toleranciaImporte, exigirReferencia } = p.criterios;
  const libros = p.movimientos.filter(m => m.origen === 'libros' && !m.conciliacionId);
  const bancoLibres = new Set(p.movimientos.filter(m => m.origen === 'banco' && !m.conciliacionId).map(m => m.id));
  const bancoById = new Map(p.movimientos.filter(m => m.origen === 'banco').map(m => [m.id, m]));

  const pares: Array<[Movimiento, Movimiento]> = [];
  const importeOk = (a: Movimiento, b: Movimiento) =>
    Math.sign(neto(a)) === Math.sign(neto(b)) && Math.abs(neto(a) - neto(b)) <= toleranciaImporte + 0.001;

  const pasada = (conReferencia: boolean) => {
    for (const l of libros) {
      if (pares.some(([pl]) => pl.id === l.id)) continue;
      let mejor: Movimiento | null = null;
      let mejorDias = Infinity;
      for (const bid of bancoLibres) {
        const b = bancoById.get(bid)!;
        if (!importeOk(l, b)) continue;
        const dias = diasEntre(l.fecha, b.fecha);
        if (dias > toleranciaDias) continue;
        if (conReferencia) {
          const rl = claveReferencia(l);
          if (!rl || rl !== claveReferencia(b)) continue;
        }
        if (dias < mejorDias) {
          mejor = b;
          mejorDias = dias;
        }
      }
      if (mejor) {
        pares.push([l, mejor]);
        bancoLibres.delete(mejor.id);
      }
    }
  };

  pasada(true);
  if (!exigirReferencia) pasada(false);

  if (pares.length === 0) return { periodo: p, nuevos: 0 };

  const ahora = new Date().toISOString();
  const asignacion = new Map<string, string>();
  const grupos: GrupoConciliacion[] = pares.map(([l, b]) => {
    const g: GrupoConciliacion = { id: uid('grp'), librosIds: [l.id], bancoIds: [b.id], tipo: 'automatica', fecha: ahora };
    asignacion.set(l.id, g.id);
    asignacion.set(b.id, g.id);
    return g;
  });
  return {
    nuevos: pares.length,
    periodo: {
      ...p,
      grupos: [...p.grupos, ...grupos],
      movimientos: p.movimientos.map(m => (asignacion.has(m.id) ? { ...m, conciliacionId: asignacion.get(m.id)! } : m))
    }
  };
}

/** Deshace el grupo de conciliación al que pertenece el movimiento */
export function desconciliar(p: PeriodoConciliacion, movimientoId: string): PeriodoConciliacion {
  assertAbierto(p);
  const mov = p.movimientos.find(m => m.id === movimientoId);
  if (!mov?.conciliacionId) return p;
  const gid = mov.conciliacionId;
  return {
    ...p,
    grupos: p.grupos.filter(g => g.id !== gid),
    movimientos: p.movimientos.map(m => (m.conciliacionId === gid ? { ...m, conciliacionId: null } : m))
  };
}

export function desconciliarTodo(p: PeriodoConciliacion): PeriodoConciliacion {
  assertAbierto(p);
  return { ...p, grupos: [], movimientos: p.movimientos.map(m => ({ ...m, conciliacionId: null })) };
}

export function agregarMovimientos(p: PeriodoConciliacion, movs: Movimiento[]): PeriodoConciliacion {
  assertAbierto(p);
  return { ...p, movimientos: [...p.movimientos, ...movs] };
}

export function eliminarMovimiento(p: PeriodoConciliacion, id: string): PeriodoConciliacion {
  assertAbierto(p);
  const mov = p.movimientos.find(m => m.id === id);
  if (!mov) return p;
  if (mov.arrastrado) throw new Error('Los movimientos arrastrados de periodos anteriores no pueden eliminarse.');
  const base = mov.conciliacionId ? desconciliar(p, id) : p;
  return { ...base, movimientos: base.movimientos.filter(m => m.id !== id) };
}

// ── Totales de seguimiento ────────────────────────────────────────────────────

export interface TotalesLado {
  total: number;
  conciliados: number;
  noConciliados: number;
  suma: number;
  sumaConciliada: number;
  sumaPendiente: number;
}

export function totalesLado(p: PeriodoConciliacion, origen: Origen): TotalesLado {
  const movs = p.movimientos.filter(m => m.origen === origen);
  const conc = movs.filter(m => m.conciliacionId);
  const pend = movs.filter(m => !m.conciliacionId);
  const sumAbs = (arr: Movimiento[]) => round2(arr.reduce((a, m) => a + m.deposito + m.retiro, 0));
  return {
    total: movs.length,
    conciliados: conc.length,
    noConciliados: pend.length,
    suma: sumAbs(movs),
    sumaConciliada: sumAbs(conc),
    sumaPendiente: sumAbs(pend)
  };
}

/** Saldo final = saldo inicial + movimientos propios del periodo (los arrastrados ya afectaron su periodo) */
export function saldoFinal(p: PeriodoConciliacion, origen: Origen): number {
  const inicial = origen === 'libros' ? p.saldoInicialLibros : p.saldoInicialBanco;
  return round2(
    inicial + p.movimientos.filter(m => m.origen === origen && !m.arrastrado).reduce((a, m) => a + neto(m), 0)
  );
}

// ── Reportes ──────────────────────────────────────────────────────────────────

export interface SeccionReporte {
  signo: '+' | '-';
  titulo: string;
  /** Campo del movimiento que suma en esta sección */
  campo: 'deposito' | 'retiro';
  movimientos: Movimiento[];
  total: number;
}

export interface ReporteConciliacion {
  empresa: string;
  banco: string;
  cuenta: string;
  numero: number;
  fechaCorte: string;
  periodo: string;
  saldoBanco: number;
  saldoLibros: number;
  secciones: SeccionReporte[];
  saldoConciliado: number;
  diferencia: number;
}

/**
 * Parte del saldo según estado de cuenta y llega al saldo según libros:
 *   Saldo banco
 *   (+) Cargos del banco no correspondidos en libros     (retiros del banco pendientes)
 *   (+) Cargos en libros no correspondidos en bancos     (depósitos en tránsito)
 *   (-) Abonos del banco no correspondidos en libros     (depósitos del banco pendientes)
 *   (-) Abonos en libros no correspondidos en bancos     (cheques / pagos en tránsito)
 *   = Saldo conciliado (debe igualar el saldo en libros)
 */
export function construirReporte(p: PeriodoConciliacion): ReporteConciliacion {
  const pend = p.movimientos
    .filter(m => !m.conciliacionId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.concepto.localeCompare(b.concepto));
  const sec = (signo: '+' | '-', titulo: string, filtro: (m: Movimiento) => boolean, campo: 'deposito' | 'retiro'): SeccionReporte => {
    const movimientos = pend.filter(m => filtro(m) && m[campo] > 0);
    return { signo, titulo, campo, movimientos, total: round2(movimientos.reduce((a, m) => a + m[campo], 0)) };
  };
  const secciones: SeccionReporte[] = [
    sec('+', 'Cargos del banco no correspondidos en libros', m => m.origen === 'banco', 'retiro'),
    sec('+', 'Cargos en libros no correspondidos en bancos', m => m.origen === 'libros', 'deposito'),
    sec('-', 'Abonos del banco no correspondidos en libros', m => m.origen === 'banco', 'deposito'),
    sec('-', 'Abonos en libros no correspondidos en bancos', m => m.origen === 'libros', 'retiro')
  ];
  const saldoBanco = saldoFinal(p, 'banco');
  const saldoLibros = saldoFinal(p, 'libros');
  const saldoConciliado = round2(
    secciones.reduce((acc, s) => (s.signo === '+' ? acc + s.total : acc - s.total), saldoBanco)
  );
  return {
    empresa: p.empresa,
    banco: p.banco,
    cuenta: p.cuenta,
    numero: p.numero,
    fechaCorte: p.fechaCorte,
    periodo: nombrePeriodo(p.fechaCorte),
    saldoBanco,
    saldoLibros,
    secciones,
    saldoConciliado,
    diferencia: round2(saldoLibros - saldoConciliado)
  };
}

// ── Procesar / cerrar periodo ─────────────────────────────────────────────────

/**
 * Cierra el periodo (irreversible) y genera el siguiente:
 *  - El periodo actual queda 'cerrado' con su resumen (histórico para reportes).
 *  - Los movimientos NO conciliados se copian al nuevo periodo como arrastrados.
 *  - Los conciliados quedan sólo en el histórico (se "limpian" del periodo activo).
 *  - Saldos iniciales del nuevo periodo = saldos finales del cerrado.
 */
export function procesarConciliacion(p: PeriodoConciliacion): { cerrado: PeriodoConciliacion; siguiente: PeriodoConciliacion } {
  assertAbierto(p);
  const saldoFinalLibros = saldoFinal(p, 'libros');
  const saldoFinalBanco = saldoFinal(p, 'banco');
  const pendientes = p.movimientos.filter(m => !m.conciliacionId);
  const cerrado: PeriodoConciliacion = {
    ...p,
    estado: 'cerrado',
    cierre: {
      saldoFinalLibros,
      saldoFinalBanco,
      conciliados: p.movimientos.length - pendientes.length,
      pendientesArrastrados: pendientes.length,
      fechaCierre: new Date().toISOString()
    }
  };
  const siguiente = crearPeriodo({
    cuentaId: p.cuentaId,
    empresa: p.empresa,
    banco: p.banco,
    cuenta: p.cuenta,
    numero: p.numero + 1,
    fechaCorte: siguienteFechaCorte(p.fechaCorte),
    saldoInicialLibros: saldoFinalLibros,
    saldoInicialBanco: saldoFinalBanco,
    criterios: { ...p.criterios },
    movimientos: pendientes.map(m => ({
      ...m,
      id: uid(m.origen === 'libros' ? 'lib' : 'ban'),
      conciliacionId: null,
      arrastrado: true
    }))
  });
  return { cerrado, siguiente };
}

// ── Importación CSV ───────────────────────────────────────────────────────────

function parseNumero(s: string | undefined): number {
  if (!s) return 0;
  const limpio = s.replace(/[$\s]/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  const n = parseFloat(limpio.replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function parseFechaFlexible(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/**
 * Importa CSV/TSV (pegado desde Excel o archivo) con columnas:
 *   Fecha, Concepto, Referencia (opcional), Depósito/Cargo, Retiro/Abono
 * Acepta encabezados en distintas variantes; fechas DD/MM/AAAA o AAAA-MM-DD.
 */
export function parseMovimientosCsv(
  texto: string,
  origen: Origen,
  periodoOrigen: number
): { movimientos: Movimiento[]; errores: string[] } {
  const lineas = texto.split(/\r?\n/).filter(l => l.trim());
  if (lineas.length === 0) return { movimientos: [], errores: ['El archivo está vacío.'] };
  const sep = lineas[0].includes('\t') ? '\t' : lineas[0].split(';').length > lineas[0].split(',').length ? ';' : ',';

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const header = splitCsvLine(lineas[0], sep).map(norm);
  const tieneHeader = header.some(h => /fecha|concepto|descrip/.test(h));
  const idx = (re: RegExp, def: number) => {
    const i = header.findIndex(h => re.test(h));
    return tieneHeader ? i : def;
  };
  // En libros: cargo = depósito; en banco: abono = depósito
  const reDep = origen === 'libros' ? /deposito|cargo|entrada|ingreso/ : /deposito|abono|entrada|ingreso/;
  const reRet = origen === 'libros' ? /retiro|abono|salida|egreso/ : /retiro|cargo|salida|egreso/;
  const iFecha = idx(/fecha/, 0);
  const iConcepto = idx(/concepto|descrip/, 1);
  const iRef = idx(/refer/, 2);
  const iDep = idx(reDep, 3);
  const iRet = idx(reRet, 4);
  const iImporte = tieneHeader ? header.findIndex(h => /^importe|^monto/.test(h)) : -1;

  const movimientos: Movimiento[] = [];
  const errores: string[] = [];
  lineas.slice(tieneHeader ? 1 : 0).forEach((linea, n) => {
    const cols = splitCsvLine(linea, sep);
    const fila = n + (tieneHeader ? 2 : 1);
    const fecha = parseFechaFlexible(cols[iFecha] ?? '');
    if (!fecha) {
      errores.push(`Fila ${fila}: fecha inválida "${cols[iFecha] ?? ''}".`);
      return;
    }
    let dep = iDep >= 0 ? parseNumero(cols[iDep]) : 0;
    let ret = iRet >= 0 ? parseNumero(cols[iRet]) : 0;
    if (iImporte >= 0 && dep === 0 && ret === 0) {
      const imp = parseNumero(cols[iImporte]);
      if (imp >= 0) dep = imp;
      else ret = -imp;
    }
    if (dep === 0 && ret === 0) {
      errores.push(`Fila ${fila}: sin importe.`);
      return;
    }
    movimientos.push(
      nuevoMovimiento(
        origen,
        { fecha, concepto: cols[iConcepto] || '(sin concepto)', referencia: iRef >= 0 ? cols[iRef] : '', deposito: dep, retiro: ret },
        periodoOrigen
      )
    );
  });
  return { movimientos, errores };
}
