/**
 * Importa el reporte "AUXILIARES DEL MES" (PDF del sistema contable) como
 * movimientos de Libros: póliza, MOV, fecha, concepto, debe/haber, saldos y
 * jerarquía de cuentas.
 *
 * La lectura del PDF (pdf.js) está separada del análisis para poder probarlo.
 */

import { nuevoMovimiento, round2, type Movimiento } from './engine';
import { MESES_MAYUS, type CuentaJerarquia } from './formatoOficial';

export interface TextoPdf {
  /** Texto tal como viene del PDF */
  str: string;
  /** x inicial en pt */
  x: number;
  /** distancia desde el borde superior en pt (parte superior del renglón) */
  top: number;
  /** tamaño de fuente en pt */
  size: number;
}

export interface AuxiliarImportado {
  entidad: string;
  fechaCorte: string;
  jerarquia: CuentaJerarquia[];
  saldoInicial: number;
  totalDebe: number;
  totalHaber: number;
  saldoFinal: number;
  movimientos: Movimiento[];
  advertencias: string[];
}

const RE_IMPORTE = /^-?\d{1,3}(,\d{3})*\.\d{2}$/;
const RE_FECHA = /^(\d{2})\/(\d{2})\/(\d{2})$/;
const BORDES_IMPORTE = [393.76, 465.76, 537.76, 609.76, 681.76, 753.76]; // SI D/H, Mov D/H, SF D/H

const num = (s: string) => parseFloat(s.replace(/,/g, ''));
const X_CONCEPTO = 131.84;

interface Token {
  t: string;
  x0: number;
  x1: number;
}

/** Separa cada fragmento en tokens (cortando en 2+ espacios) con su posición exacta (Courier: 0.6·size por carácter) */
function tokens(items: TextoPdf[]): Token[] {
  const out: Token[] = [];
  for (const it of items) {
    const cw = 0.6 * it.size;
    const re = /\S+(?: \S+)*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(it.str))) {
      out.push({ t: m[0], x0: it.x + m.index * cw, x1: it.x + (m.index + m[0].length) * cw });
    }
  }
  return out.sort((a, b) => a.x0 - b.x0);
}

function columnaImporte(x1: number): number {
  let mejor = 0;
  BORDES_IMPORTE.forEach((b, i) => {
    if (Math.abs(b - x1) < Math.abs(BORDES_IMPORTE[mejor] - x1)) mejor = i;
  });
  return Math.abs(BORDES_IMPORTE[mejor] - x1) < 12 ? mejor : -1;
}

export function analizarAuxiliar(paginas: TextoPdf[][], periodoOrigen = 1): AuxiliarImportado {
  const advertencias: string[] = [];
  let entidad = '';
  let fechaCorte = '';
  const jerarquia: Array<CuentaJerarquia & { importes: number[] }> = [];
  const movimientos: Movimiento[] = [];
  let ultimo: Movimiento | null = null;

  for (const items of paginas) {
    // Agrupa por renglón
    const renglones = new Map<number, TextoPdf[]>();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const clave = Math.round(it.top * 2) / 2;
      const existente = [...renglones.keys()].find(k => Math.abs(k - clave) < 1.2);
      const k = existente ?? clave;
      if (!renglones.has(k)) renglones.set(k, []);
      renglones.get(k)!.push(it);
    }
    const ordenados = [...renglones.entries()].sort((a, b) => a[0] - b[0]);

    for (const [top, its] of ordenados) {
      const texto = its.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
      if (top < 136) {
        const mEnt = texto.match(/ENTIDAD:\s*(.+?)(?:\s+DEL\s|$)/);
        if (mEnt && !entidad) entidad = mEnt[1].trim();
        const mPer = texto.match(/DEL\s+1\s+AL\s+(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚ]+)\s+DE\s+(\d{4})/);
        if (mPer && !fechaCorte) {
          const mes = MESES_MAYUS.indexOf(mPer[2]) + 1;
          if (mes > 0) fechaCorte = `${mPer[3]}-${String(mes).padStart(2, '0')}-${mPer[1].padStart(2, '0')}`;
        }
        continue;
      }
      if (top > 570 || /^Hoja \d+ de \d+$/.test(texto)) continue;

      const toks = tokens(its);
      const importes: Array<{ col: number; valor: number }> = [];
      const resto: Token[] = [];
      for (const tk of toks) {
        if (RE_IMPORTE.test(tk.t) && tk.x0 > 300) {
          const col = columnaImporte(tk.x1);
          if (col >= 0) {
            importes.push({ col, valor: num(tk.t) });
            continue;
          }
        }
        resto.push(tk);
      }
      const fechaTok = resto.find(tk => tk.x0 >= 78 && tk.x0 < 125 && RE_FECHA.test(tk.t));
      const tokConcepto = resto.filter(tk => tk.x0 >= 125);
      const concepto = tokConcepto.map(tk => tk.t).join(' ');
      // Renglón con la posición original de cada fragmento
      const renglon = tokConcepto.map(tk => ({ x: round2(tk.x0 - X_CONCEPTO), t: tk.t }));

      if (fechaTok) {
        const [, d, m, a] = fechaTok.t.match(RE_FECHA)!;
        const movTok = resto.find(tk => tk.x0 < 50);
        const polTok = resto.find(tk => tk.x0 >= 50 && tk.x0 < 78);
        const debe = importes.find(i => i.col === 2)?.valor ?? 0;
        const haber = importes.find(i => i.col === 3)?.valor ?? 0;
        ultimo = nuevoMovimiento(
          'libros',
          {
            fecha: `20${a}-${m}-${d}`,
            concepto,
            referencia: polTok?.t ?? '',
            poliza: polTok?.t,
            mov: movTok?.t,
            deposito: debe,
            retiro: haber
          },
          periodoOrigen
        );
        ultimo.conceptoRenglones = [renglon];
        movimientos.push(ultimo);
        continue;
      }

      const primero = resto[0];
      if (primero && primero.x0 < 50 && /^\d{4}/.test(primero.t)) {
        const nombre = resto.filter(tk => tk.x0 >= 125).map(tk => tk.t).join(' ');
        const valores = [0, 0, 0, 0, 0, 0];
        importes.forEach(i => (valores[i.col] = i.valor));
        const codigo = resto.filter(tk => tk.x0 < 125).map(tk => tk.t).join(' ').replace(/\s+/g, ' ');
        jerarquia.push({ codigo, nombre, importes: valores });
        ultimo = null;
        continue;
      }

      if (ultimo && concepto) {
        ultimo.concepto = `${ultimo.concepto} ${concepto}`.trim();
        ultimo.conceptoRenglones = [...(ultimo.conceptoRenglones ?? []), renglon];
      }
    }
  }

  const detalle = jerarquia[jerarquia.length - 1];
  const totalDebe = round2(movimientos.reduce((a, m) => a + m.deposito, 0));
  const totalHaber = round2(movimientos.reduce((a, m) => a + m.retiro, 0));
  let saldoInicial = 0;
  let saldoFinal = round2(totalDebe - totalHaber);
  if (detalle) {
    const [siD, siH, mD, mH, sfD, sfH] = detalle.importes;
    saldoInicial = round2(siD - siH);
    saldoFinal = round2(sfD - sfH);
    if (Math.abs(mD - totalDebe) > 0.005 || Math.abs(mH - totalHaber) > 0.005) {
      advertencias.push(
        `Las sumas de los movimientos leídos (Debe ${totalDebe.toFixed(2)}, Haber ${totalHaber.toFixed(2)}) no coinciden con los totales del auxiliar (Debe ${mD.toFixed(2)}, Haber ${mH.toFixed(2)}).`
      );
    }
    if (Math.abs(round2(saldoInicial + totalDebe - totalHaber) - saldoFinal) > 0.005) {
      advertencias.push('El saldo final del auxiliar no corresponde a saldo inicial + debe - haber.');
    }
  } else {
    advertencias.push('No se encontró la cuenta contable en el auxiliar.');
  }
  if (!fechaCorte) advertencias.push('No se encontró el periodo (DEL 1 AL ... DE ...) en el auxiliar.');
  if (movimientos.length === 0) advertencias.push('No se encontraron movimientos en el auxiliar.');

  return {
    entidad,
    fechaCorte,
    jerarquia: jerarquia.map(({ codigo, nombre }) => ({ codigo, nombre })),
    saldoInicial,
    totalDebe,
    totalHaber,
    saldoFinal,
    movimientos,
    advertencias
  };
}

/** Lee el texto con posiciones de un PDF usando pdf.js (sólo navegador) */
export async function extraerTextoPdf(datos: ArrayBuffer): Promise<TextoPdf[][]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/conciliacion/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(datos) }).promise;
  return extraerConPdfjs(doc);
}

interface DocPdfjs {
  numPages: number;
  getPage(n: number): Promise<{
    getViewport(o: { scale: number }): { height: number };
    getTextContent(): Promise<{ items: unknown[] }>;
  }>;
}

export async function extraerConPdfjs(doc: DocPdfjs): Promise<TextoPdf[][]> {
  const paginas: TextoPdf[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const alto = page.getViewport({ scale: 1 }).height;
    const contenido = await page.getTextContent();
    const items: TextoPdf[] = [];
    for (const raw of contenido.items) {
      const it = raw as { str?: string; transform?: number[] };
      if (!it.str || !it.transform) continue;
      const size = Math.hypot(it.transform[2], it.transform[3]) || it.transform[0];
      const base = it.transform[5];
      items.push({ str: it.str, x: it.transform[4], top: alto - base - 0.843 * size, size });
    }
    paginas.push(items);
  }
  return paginas;
}
