/**
 * Modelo celda-por-celda del formato oficial "CONCILIACIÓN BANCARIA".
 *
 * Replica la plantilla del Ayuntamiento (01_26_08_CONC_...xlsx): mismas columnas,
 * fuentes, bordes, fórmulas, espaciado de filas, logos y bloque de firmas.
 * El mismo modelo alimenta al generador de Excel, al de PDF y a la vista previa.
 */

import { construirReporte, round2, type Movimiento, type PeriodoConciliacion } from './engine';
import {
  fechaDMY,
  fechaExcelCorta,
  fechaExcelMDY,
  formatoDe,
  numeroMX,
  textoFechaLarga,
  textoPeriodoConc
} from './formatoOficial';

export type FuenteHoja = 'Arial' | 'Calibri';
export type Borde = 'thin' | 'medium';

export interface CeldaHoja {
  /** Columna 0..7 (A..H) */
  col: number;
  texto?: string;
  /** Valor numérico (si hay fórmula, es el resultado ya calculado) */
  numero?: number;
  /** Valor de fecha YYYY-MM-DD */
  fecha?: string;
  /** Fórmula de Excel sin "=" */
  formula?: string;
  numFmt?: string;
  fuente: FuenteHoja;
  tam: number;
  negrita?: boolean;
  alin?: 'left' | 'center' | 'right';
  bordes?: { t?: Borde; b?: Borde; l?: Borde; r?: Borde };
  /** Número de columnas combinadas (incluida ésta) */
  span?: number;
}

export interface FilaHoja {
  /** Alto en puntos (15 por omisión) */
  alto?: number;
  celdas: CeldaHoja[];
}

export interface ImagenHoja {
  archivo: 'logo-ayuntamiento.png' | 'logo-lapaz.png';
  col: number;
  fila: number; // 0-based
  offX: number; // px
  offY: number; // px
  ancho: number; // px
  alto: number; // px
}

export interface HojaOficial {
  /** Anchos de columna en caracteres (como los guarda Excel) */
  anchos: number[];
  filas: FilaHoja[];
  imagenes: ImagenHoja[];
}

/**
 * Anchos A..H de la plantilla. A, B y H usan el ancho estándar de esa hoja (10.71 visibles = 80 px),
 * que se guarda explícito como 11.42578125 para que se vea igual en cualquier Excel.
 */
export const ANCHOS_PLANTILLA = [11.42578125, 11.42578125, 11.7109375, 52, 13.85546875, 13, 12.28515625, 11.42578125];
export const ALTO_FILA = 15;
export const ALTO_FILA_ALTA = 15.75;

const NUM = '#,##0.00';
const TXT = '@';
const BOX: CeldaHoja['bordes'] = { t: 'medium', b: 'medium', l: 'medium', r: 'medium' };

const A = 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6, H = 7;

/** Texto visible de una celda, como lo muestra Excel */
export function textoVisible(c: CeldaHoja): string {
  if (c.fecha) {
    if (c.numFmt === 'd-mmm-yy') return fechaExcelCorta(c.fecha);
    return fechaExcelMDY(c.fecha);
  }
  if (typeof c.numero === 'number') return c.numFmt === NUM ? numeroMX(c.numero) : String(c.numero);
  return c.texto ?? '';
}

/** Alineación efectiva (Excel alinea números a la derecha y texto a la izquierda) */
export function alineacion(c: CeldaHoja): 'left' | 'center' | 'right' {
  if (c.alin) return c.alin;
  return typeof c.numero === 'number' || c.fecha ? 'right' : 'left';
}

const etiqueta = (col: number, texto: string, extra: Partial<CeldaHoja> = {}): CeldaHoja => ({
  col,
  texto,
  numFmt: TXT,
  fuente: 'Arial',
  tam: 9,
  alin: 'left',
  ...extra
});

/** Celda vacía que sólo aporta un borde (con el estilo que trae la plantilla) */
const borde = (col: number, lado: 't' | 'b', extra: Partial<CeldaHoja> = {}): CeldaHoja => ({
  col,
  fuente: 'Arial',
  tam: 9,
  bordes: { [lado]: 'medium' },
  ...extra
});

const caja = (numero: number, formula?: string): CeldaHoja => ({
  col: F,
  numero: round2(numero),
  formula,
  numFmt: NUM,
  fuente: 'Arial',
  tam: 9,
  bordes: BOX
});

type ColumnasPartida = 'cheque' | 'contabilidad' | 'banco-abono' | 'banco-cargo';

function filaPartida(m: Movimiento | null, importe: number, tipo: ColumnasPartida): FilaHoja {
  if (!m) return { celdas: [] };
  const cal = (col: number, texto: string, extra: Partial<CeldaHoja> = {}): CeldaHoja => ({
    col,
    texto,
    numFmt: TXT,
    fuente: 'Calibri',
    tam: 9,
    alin: 'left',
    ...extra
  });
  const imp = (fuente: FuenteHoja): CeldaHoja => ({ col: E, numero: round2(importe), numFmt: NUM, fuente, tam: 9 });
  const fecha = cal(A, fechaDMY(m.fecha));
  switch (tipo) {
    case 'cheque':
      return {
        celdas: [
          fecha,
          cal(B, m.cheque ?? '', { alin: 'center' }),
          cal(C, m.poliza ?? ''),
          cal(D, m.beneficiario || m.concepto),
          imp('Calibri')
        ]
      };
    case 'contabilidad':
      return { celdas: [fecha, cal(C, m.poliza ?? ''), cal(D, m.concepto), imp('Calibri')] };
    case 'banco-abono':
      return { celdas: [fecha, cal(C, m.concepto), imp('Arial')] };
    case 'banco-cargo':
      return { celdas: [fecha, cal(C, m.concepto), imp('Calibri')] };
  }
}

export function construirHojaConciliacion(p: PeriodoConciliacion): HojaOficial {
  const f = formatoDe(p);
  const rep = construirReporte(p);
  const [secCheques, secCargosCont, secAbonosBanco, secCargosBanco] = rep.secciones;
  const filas: FilaHoja[] = [];
  /** Agrega una fila y devuelve su número (1-based, como en Excel) */
  const push = (fila: FilaHoja = { celdas: [] }) => filas.push(fila);
  const vacia = (alto?: number) => push({ alto, celdas: [] });

  // 1-2: espacio de logos
  vacia();
  vacia();
  // 3: municipio
  push({ celdas: [etiqueta(D, f.municipio, { tam: 10, negrita: true, alin: 'center' })] });
  vacia();
  // 5: línea bajo los logos
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      borde(A, 'b', { numFmt: TXT, alin: 'left' }),
      borde(B, 'b', { numFmt: TXT, alin: 'center' }),
      borde(C, 'b', { alin: 'center' }),
      borde(D, 'b'),
      borde(E, 'b', { numFmt: NUM }),
      borde(F, 'b', { numFmt: NUM }),
      borde(G, 'b', { fuente: 'Calibri', tam: 11 })
    ]
  });
  // 6-8: títulos
  push({
    celdas: [
      ...[A, B, C, E, F, G].map(col => borde(col, 't', { numFmt: TXT, tam: 10, negrita: true })),
      { col: D, texto: 'CONCILIACIÓN BANCARIA', fuente: 'Arial', tam: 9, negrita: true, alin: 'center' }
    ]
  });
  push({ celdas: [{ col: D, texto: textoPeriodoConc(p.fechaCorte), fuente: 'Arial', tam: 9, negrita: true, alin: 'center' }] });
  push({
    celdas: [
      { col: A, texto: ' ', fuente: 'Calibri', tam: 11 },
      { col: D, texto: f.nombreCuenta, fuente: 'Arial', tam: 9, negrita: true, alin: 'center' },
      { col: E, texto: `BANCO           ${f.bancoCorto}`, numFmt: NUM, fuente: 'Arial', tam: 9, negrita: true }
    ]
  });
  // 9: cuenta contable / cuenta bancaria con línea inferior
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      etiqueta(A, `CONTABLE ${f.cuentaContable}`, { negrita: true, bordes: { b: 'medium' } }),
      borde(B, 'b', { numFmt: TXT, alin: 'center' }),
      borde(C, 'b', { alin: 'center' }),
      borde(D, 'b'),
      etiqueta(E, `CUENTA ${f.numeroCuenta}`, { negrita: true, bordes: { b: 'medium' } }),
      borde(F, 'b', { numFmt: NUM }),
      borde(G, 'b', { fuente: 'Calibri', tam: 11 })
    ]
  });
  vacia();
  vacia(ALTO_FILA_ALTA);
  // 12: saldo según estado de cuenta
  push({ alto: ALTO_FILA_ALTA, celdas: [etiqueta(A, 'SALDO SEGUN ESTADO DE CUENTA BANCARIO'), caja(rep.saldoBanco)] });
  const filaSaldoBanco = filas.length;
  vacia();
  push({ celdas: [etiqueta(A, '- ABONOS DE CONTABILIDAD NO CORRESPONDIDOS POR EL BANCO')] });
  vacia(ALTO_FILA_ALTA);

  // Cheques en tránsito
  const filaCheques = filas.length + 1;
  const iniCheques = filaCheques + 3;
  const nCheques = Math.max(1, secCheques.movimientos.length);
  const finCheques = iniCheques + nCheques - 1;
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [etiqueta(A, 'CHEQUES EN TRÁNSITO'), caja(secCheques.total, `SUM(E${iniCheques}:E${finCheques})`)]
  });
  const enc = (col: number, texto: string, alin: 'center' | 'right' = 'center'): CeldaHoja => ({
    col,
    texto,
    numFmt: col === E ? NUM : col === A ? TXT : 'General',
    fuente: 'Arial',
    tam: 8,
    alin
  });
  push({ celdas: [enc(A, 'FECHA'), enc(B, 'CHEQUE'), enc(C, 'POLIZA'), enc(D, 'BENEFICIARIO'), enc(E, 'IMPORTE', 'right')] });
  vacia();
  for (let i = 0; i < nCheques; i++) {
    const m = secCheques.movimientos[i] ?? null;
    push(filaPartida(m, m ? m.retiro : 0, 'cheque'));
  }
  vacia(ALTO_FILA_ALTA);

  // + Cargos de contabilidad no correspondidos por el banco
  const filaCargosCont = filas.length + 1;
  const iniCargosCont = filaCargosCont + 2;
  const nCargosCont = Math.max(2, secCargosCont.movimientos.length);
  const finCargosCont = iniCargosCont + nCargosCont - 1;
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      etiqueta(A, '+ CARGOS DE CONTABILIDAD NO CORRESPONDIDOS POR EL BANCO'),
      caja(secCargosCont.total, `SUM(E${iniCargosCont}:E${finCargosCont})`)
    ]
  });
  vacia();
  for (let i = 0; i < nCargosCont; i++) {
    const m = secCargosCont.movimientos[i] ?? null;
    const fila = filaPartida(m, m ? m.deposito : 0, 'contabilidad');
    if (i === nCargosCont - 1) fila.alto = ALTO_FILA_ALTA;
    push(fila);
  }

  // Subtotal
  const subtotal = round2(rep.saldoBanco - secCheques.total + secCargosCont.total);
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      { col: D, texto: 'SUBTOTAL', numFmt: 'General', fuente: 'Arial', tam: 9, alin: 'right' },
      caja(subtotal, `F${filaSaldoBanco}-F${filaCheques}+F${filaCargosCont}`)
    ]
  });
  const filaSubtotal = filas.length;
  vacia(ALTO_FILA_ALTA);

  // - Abonos del banco no correspondidos en contabilidad
  const filaAbonosBanco = filas.length + 1;
  const iniAbonosBanco = filaAbonosBanco + 3;
  const nAbonosBanco = Math.max(1, secAbonosBanco.movimientos.length);
  const finAbonosBanco = iniAbonosBanco + nAbonosBanco - 1;
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      etiqueta(A, '- ABONOS DEL BANCO NO CORRESPONDIDOS EN CONTABILIDAD'),
      caja(secAbonosBanco.total, `SUM(E${iniAbonosBanco}:E${finAbonosBanco})`)
    ]
  });
  vacia();
  vacia();
  for (let i = 0; i < nAbonosBanco; i++) {
    const m = secAbonosBanco.movimientos[i] ?? null;
    push(filaPartida(m, m ? m.deposito : 0, 'banco-abono'));
  }
  vacia(ALTO_FILA_ALTA);

  // + Cargos del banco no correspondidos en contabilidad
  const filaCargosBanco = filas.length + 1;
  const iniCargosBanco = filaCargosBanco + 2;
  const nCargosBanco = Math.max(1, secCargosBanco.movimientos.length);
  const finCargosBanco = iniCargosBanco + nCargosBanco - 1;
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      etiqueta(A, '+ CARGOS DEL BANCO NO CORRESPONDIDOS EN CONTABILIDAD'),
      caja(secCargosBanco.total, `SUM(E${iniCargosBanco}:E${finCargosBanco})`)
    ]
  });
  vacia();
  for (let i = 0; i < nCargosBanco; i++) {
    const m = secCargosBanco.movimientos[i] ?? null;
    push(filaPartida(m, m ? m.retiro : 0, 'banco-cargo'));
  }
  vacia();
  vacia(ALTO_FILA_ALTA);

  // Saldo según libros
  push({
    alto: ALTO_FILA_ALTA,
    celdas: [
      etiqueta(A, `SALDO SEGÚN LIBROS AL ${textoFechaLarga(p.fechaCorte)}`),
      caja(rep.saldoConciliado, `+F${filaSubtotal}-F${filaAbonosBanco}+F${filaCargosBanco}`)
    ]
  });
  for (let i = 0; i < 6; i++) vacia();

  // Firmas
  const [f1, f2, f3] = f.firmas;
  const firma = (col: number, texto: string, span?: number): CeldaHoja => ({
    col,
    texto,
    numFmt: col === A ? TXT : 'General',
    fuente: 'Arial',
    tam: 8,
    negrita: true,
    alin: 'center',
    span
  });
  push({ celdas: [firma(A, f1.nombre, 3), firma(D, f2.nombre), firma(E, f3.nombre, 3)] });
  push({ celdas: [firma(A, f1.cargo, 3), firma(D, f2.cargo), { ...firma(E, f3.cargo, 3), numFmt: NUM }] });
  vacia();
  const fechaElab = f.fechaElaboracion || p.fechaCorte;
  push({
    celdas: [
      { col: G, texto: 'DIA   MES    AÑO', numFmt: 'General', fuente: 'Arial', tam: 7 },
      { col: H, fecha: fechaElab, numFmt: 'mm-dd-yy', fuente: 'Calibri', tam: 11 }
    ]
  });
  const filaFechaH = filas.length;
  push({
    celdas: [
      { col: E, texto: 'FECHA DE ELABORACIÓN', numFmt: NUM, fuente: 'Arial', tam: 7 },
      {
        col: G,
        fecha: fechaElab,
        formula: `$H$${filaFechaH}`,
        numFmt: 'd-mmm-yy',
        fuente: 'Arial',
        tam: 8,
        alin: 'left',
        bordes: { t: 'thin', b: 'thin', l: 'thin', r: 'thin' }
      }
    ]
  });

  return {
    anchos: ANCHOS_PLANTILLA,
    filas,
    imagenes: [
      { archivo: 'logo-ayuntamiento.png', col: A, fila: 0, offX: 10, offY: 11, ancho: 250, alto: 75 },
      { archivo: 'logo-lapaz.png', col: E, fila: 0, offX: 10, offY: 18, ancho: 238, alto: 75 }
    ]
  };
}

// ── Geometría de impresión (como la calcula Excel) ───────────────────────────

/** Ancho en píxeles de una columna a partir de su ancho en caracteres (fuente estándar Calibri 11) */
export function anchoColumnaPx(caracteres: number): number {
  return Math.trunc(((256 * caracteres + Math.trunc(128 / 7)) / 256) * 7);
}

export function anchosPx(hoja: HojaOficial): number[] {
  return hoja.anchos.map(anchoColumnaPx);
}

/**
 * Anchos de IMPRESIÓN (pt al 100 %). Al imprimir, Excel mide las columnas con las métricas de la
 * impresora (≈5.82 pt por carácter de ancho guardado), algo más anchas que en pantalla; por eso la
 * plantilla queda "ajustada a 1 página de ancho" al 65 %. Las columnas A, B y H usan el ancho
 * estándar de la hoja (10.71).
 */
export const ANCHOS_IMPRESION_CAR = [10.7109375, 10.7109375, 11.7109375, 52, 13.85546875, 13, 12.28515625, 10.7109375];
export const PT_POR_CARACTER = 5.82;
export function anchosImpresionPt(): number[] {
  return ANCHOS_IMPRESION_CAR.map(c => c * PT_POR_CARACTER);
}
