/**
 * Importa el estado de cuenta bancario en PDF (con texto, no escaneado) como
 * movimientos del Banco.
 *
 * Funciona con cualquier banco que presente los movimientos en tabla:
 *  1. Ubica el encabezado de la tabla (Fecha · Concepto · Cargos/Retiros · Abonos/Depósitos · Saldo).
 *  2. Cada renglón que empieza con fecha es un movimiento; los renglones siguientes
 *     sin fecha ni importes son continuación del concepto.
 *  3. Asigna cada importe a su columna por posición. Si el banco usa una sola columna
 *     de "Importe", decide cargo/abono con la variación del saldo.
 *  4. Comprueba la cadena de saldos y saldo inicial + abonos − cargos = saldo final.
 */

import { nuevoMovimiento, round2, type Movimiento } from './engine';
import type { TextoPdf } from './importarAuxiliar';

export interface EstadoCuentaImportado {
  movimientos: Movimiento[];
  saldoInicial?: number;
  saldoFinal?: number;
  totalAbonos: number;
  totalCargos: number;
  /** Renglones cuyo saldo no cuadra con el saldo anterior ± importe */
  saldosNoCuadran: number;
  /** Cómo se identificaron cargos y abonos */
  metodo: 'columnas' | 'saldo';
  advertencias: string[];
}

type Columna = 'cargo' | 'abono' | 'saldo' | 'importe';

interface Token {
  t: string;
  x0: number;
  x1: number;
}

interface Renglon {
  top: number;
  pagina: number;
  tokens: Token[];
  texto: string;
}

const MESES: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6, JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12,
  JAN: 1, APR: 4, AUG: 8, DEC: 12
};

const RE_IMPORTE = /^\(?-?\$?\s?(\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\)?-?$/;
const RE_FECHA_NUM = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/;
const RE_FECHA_MES = /^(\d{1,2})[/\-.\s]?([A-Za-z]{3})[A-Za-z]*\.?(?:[/\-.\s]?(\d{2}|\d{4}))?$/;
const RE_SALDO_INICIAL = /saldo\s+(anterior|inicial)/i;
const RE_SALDO_FINAL = /saldo\s+(final|al\s+corte|actual|nuevo)/i;

const quitarAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const PALABRAS: Record<Columna | 'descripcion' | 'fecha', RegExp> = {
  fecha: /\bfecha\b|\bdia\b/i,
  cargo: /cargo|retiro|debito|egreso|salida/i,
  abono: /abono|deposito|credito|ingreso|entrada/i,
  saldo: /saldo/i,
  importe: /importe|monto|cantidad/i,
  descripcion: /concepto|descrip|detalle|movimiento|referencia/i
};

function valorImporte(t: string): number {
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-') || t.endsWith('-');
  const n = parseFloat(t.replace(/[^0-9.]/g, ''));
  return neg ? -n : n;
}

/** Interpreta una fecha (dd/mm/aaaa, dd-mm-aa, 01-AGO-2026, 01 AGO, 01AGO26…) */
export function interpretarFecha(t: string, anioRef: number, mesRef: number): string | null {
  const s = t.trim().toUpperCase();
  let d: number, m: number, y: number | undefined;
  let mt = s.match(RE_FECHA_NUM);
  if (mt) {
    d = +mt[1];
    m = +mt[2];
    y = +mt[3];
  } else if ((mt = s.match(RE_FECHA_MES)) && MESES[quitarAcentos(mt[2]).toUpperCase().slice(0, 3)]) {
    d = +mt[1];
    m = MESES[quitarAcentos(mt[2]).toUpperCase().slice(0, 3)];
    y = mt[3] ? +mt[3] : undefined;
  } else return null;
  if (y === undefined) y = m > mesRef ? anioRef - 1 : anioRef;
  if (y < 100) y += 2000;
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Separa fragmentos en palabras/grupos (corta en 2+ espacios) estimando su posición */
function tokensDe(items: TextoPdf[]): Token[] {
  const out: Token[] = [];
  for (const it of items) {
    const largo = it.str.length || 1;
    const cw = it.w && it.w > 0 ? it.w / largo : 0.5 * it.size;
    const re = /\S+(?: \S+)*/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(it.str))) out.push({ t: m[0], x0: it.x + m.index * cw, x1: it.x + (m.index + m[0].length) * cw });
  }
  out.sort((a, b) => a.x0 - b.x0);
  // Un grupo que mezcla texto e importe ("COMISION 348.00") se separa en palabras
  return out.flatMap(tk => {
    const partes = tk.t.split(' ');
    if (partes.length < 2 || !partes.some(p => RE_IMPORTE.test(p))) return [tk];
    const cw = (tk.x1 - tk.x0) / tk.t.length;
    let pos = 0;
    return partes.map(p => {
      const x0 = tk.x0 + pos * cw;
      pos += p.length + 1;
      return { t: p, x0, x1: x0 + p.length * cw };
    });
  });
}

function agruparRenglones(paginas: TextoPdf[][]): Renglon[] {
  const out: Renglon[] = [];
  paginas.forEach((items, pagina) => {
    const ordenados = items.filter(i => i.str.trim()).sort((a, b) => a.top - b.top || a.x - b.x);
    const grupos: TextoPdf[][] = [];
    for (const it of ordenados) {
      const g = grupos[grupos.length - 1];
      if (g && Math.abs(g[0].top - it.top) <= Math.max(2, it.size * 0.35)) g.push(it);
      else grupos.push([it]);
    }
    for (const g of grupos) {
      const tokens = tokensDe(g);
      out.push({ top: g[0].top, pagina, tokens, texto: tokens.map(t => t.t).join(' ') });
    }
  });
  return out;
}

interface DefColumna {
  tipo: Columna;
  centro: number;
  x1: number;
}

function columnasDeEncabezado(renglones: Renglon[]): DefColumna[] {
  const cols: DefColumna[] = [];
  for (const r of renglones) {
    for (const tk of r.tokens) {
      const t = quitarAcentos(tk.t);
      const tipo = (['cargo', 'abono', 'saldo', 'importe'] as Columna[]).find(c => PALABRAS[c].test(t));
      if (!tipo) continue;
      // "SALDO" dentro de "CARGOS" no aplica; si un mismo token tiene dos palabras, gana la primera
      if (!cols.some(c => c.tipo === tipo && Math.abs(c.centro - (tk.x0 + tk.x1) / 2) < 15)) {
        cols.push({ tipo, centro: (tk.x0 + tk.x1) / 2, x1: tk.x1 });
      }
    }
  }
  return cols;
}

function esEncabezado(r: Renglon): boolean {
  const t = quitarAcentos(r.texto);
  if (r.tokens.some(tk => RE_IMPORTE.test(tk.t))) return false;
  const tipos = (['cargo', 'abono', 'saldo', 'importe'] as Columna[]).filter(c => PALABRAS[c].test(t));
  return PALABRAS.fecha.test(t) ? tipos.length >= 1 : tipos.length >= 2;
}

export function analizarEstadoCuenta(
  paginas: TextoPdf[][],
  opciones: { fechaCorte: string; periodoOrigen?: number }
): EstadoCuentaImportado {
  const [anioRef, mesRef] = opciones.fechaCorte.split('-').map(Number);
  const advertencias: string[] = [];
  const renglones = agruparRenglones(paginas);

  if (renglones.length === 0) {
    return {
      movimientos: [],
      totalAbonos: 0,
      totalCargos: 0,
      saldosNoCuadran: 0,
      metodo: 'columnas',
      advertencias: ['El PDF no tiene texto seleccionable (parece una imagen escaneada). Descarga el estado de cuenta en PDF desde la banca en línea o en Excel.']
    };
  }

  // 1. Encabezados de la tabla (pueden ocupar dos renglones y repetirse en cada hoja)
  let columnas: DefColumna[] = [];
  const inicioTabla = new Map<number, number>(); // página → top donde empieza la tabla
  renglones.forEach((r, i) => {
    if (!esEncabezado(r)) return;
    const sig = renglones[i + 1];
    const bloque = [r];
    if (sig && sig.pagina === r.pagina && sig.top - r.top < 14 && !sig.tokens.some(t => RE_IMPORTE.test(t.t)) && !fechaDeRenglon(sig)) bloque.push(sig);
    const cols = columnasDeEncabezado(bloque);
    if (cols.some(c => c.tipo !== 'saldo')) {
      columnas = cols;
      if (!inicioTabla.has(r.pagina)) inicioTabla.set(r.pagina, bloque[bloque.length - 1].top);
    }
  });
  const tieneCargoAbono = columnas.some(c => c.tipo === 'cargo') && columnas.some(c => c.tipo === 'abono');
  const metodo: 'columnas' | 'saldo' = tieneCargoAbono ? 'columnas' : 'saldo';
  const hayEncabezado = inicioTabla.size > 0;

  function fechaDeRenglon(r: Renglon): { fecha: string; usados: number; x1: number } | null {
    const [a, b, c] = r.tokens;
    if (!a) return null;
    const f1 = interpretarFecha(a.t, anioRef, mesRef);
    if (f1) {
      // Algunas columnas traen dos fechas (operación y liquidación): se usa la primera
      const extra = b && interpretarFecha(b.t, anioRef, mesRef) ? 1 : 0;
      return { fecha: f1, usados: 1 + extra, x1: (extra ? b : a).x1 };
    }
    if (b) {
      const f2 = interpretarFecha(`${a.t} ${b.t}`, anioRef, mesRef);
      if (f2) return { fecha: f2, usados: 2, x1: b.x1 };
      if (c) {
        const f3 = interpretarFecha(`${a.t} ${b.t} ${c.t}`, anioRef, mesRef);
        if (f3 && /^\d{2,4}$/.test(c.t)) return { fecha: f3, usados: 3, x1: c.x1 };
      }
    }
    return null;
  }

  const columnaDe = (tk: Token): Columna | null => {
    if (columnas.length === 0) return null;
    let mejor: DefColumna | null = null;
    let dist = Infinity;
    for (const c of columnas) {
      const d = Math.min(Math.abs(c.x1 - tk.x1), Math.abs(c.centro - (tk.x0 + tk.x1) / 2));
      if (d < dist) {
        dist = d;
        mejor = c;
      }
    }
    return mejor && dist < 80 ? mejor.tipo : null;
  };

  // 2. Movimientos
  const crudos: Array<{ fecha: string; concepto: string[]; importe?: number; cargo?: number; abono?: number; saldo?: number; top: number; pagina: number; xDesc: number }> = [];
  let saldoInicial: number | undefined;
  let saldoFinal: number | undefined;
  let ultimo: (typeof crudos)[number] | null = null;
  let ultimoTop = 0;
  let ultimaPagina = -1;

  for (const r of renglones) {
    const ini = inicioTabla.get(r.pagina);
    if (hayEncabezado && (ini === undefined ? !inicioTabla.size : r.top <= ini)) {
      // Antes de la tabla: sólo saldos de resumen
      capturarSaldos(r);
      if (r.pagina !== ultimaPagina) ultimo = null;
      continue;
    }
    const importes = r.tokens.filter(tk => RE_IMPORTE.test(tk.t));
    const f = fechaDeRenglon(r);
    const texto = quitarAcentos(r.texto);

    if (RE_SALDO_INICIAL.test(texto) || RE_SALDO_FINAL.test(texto) || /^total/i.test(texto)) {
      capturarSaldos(r);
      ultimo = null;
      continue;
    }

    if (f && importes.length > 0) {
      const desc = r.tokens.slice(f.usados).filter(tk => !RE_IMPORTE.test(tk.t));
      const mov: (typeof crudos)[number] = {
        fecha: f.fecha,
        concepto: [desc.map(t => t.t).join(' ')],
        top: r.top,
        pagina: r.pagina,
        xDesc: desc[0]?.x0 ?? f.x1
      };
      if (metodo === 'columnas') {
        for (const tk of importes) {
          const col = columnaDe(tk);
          const v = Math.abs(valorImporte(tk.t));
          if (col === 'cargo') mov.cargo = v;
          else if (col === 'abono') mov.abono = v;
          else if (col === 'saldo') mov.saldo = valorImporte(tk.t);
        }
        if (mov.cargo === undefined && mov.abono === undefined) {
          mov.importe = valorImporte(importes[0].t);
          if (importes.length > 1) mov.saldo = valorImporte(importes[importes.length - 1].t);
        }
      } else {
        mov.importe = valorImporte(importes[0].t);
        if (importes.length > 1) mov.saldo = valorImporte(importes[importes.length - 1].t);
      }
      crudos.push(mov);
      ultimo = mov;
      ultimoTop = r.top;
      ultimaPagina = r.pagina;
      continue;
    }

    // Continuación del concepto: sin fecha ni importes, cerca y alineada con la descripción
    if (ultimo && !f && importes.length === 0 && r.pagina === ultimaPagina && r.top - ultimoTop < 22 && r.tokens[0] && r.tokens[0].x0 >= ultimo.xDesc - 8) {
      ultimo.concepto.push(r.texto);
      ultimoTop = r.top;
      continue;
    }
    if (importes.length > 0 || f) ultimo = null;
  }

  function capturarSaldos(r: Renglon) {
    const texto = quitarAcentos(r.texto);
    const importes = r.tokens.filter(tk => RE_IMPORTE.test(tk.t));
    if (!importes.length) return;
    const v = valorImporte(importes[importes.length - 1].t);
    if (RE_SALDO_INICIAL.test(texto) && saldoInicial === undefined) saldoInicial = v;
    if (RE_SALDO_FINAL.test(texto)) saldoFinal = v;
  }

  // 3. Cargo / abono por variación de saldo cuando no hay columnas separadas
  let saldosNoCuadran = 0;
  let saldoPrevio = saldoInicial;
  for (const m of crudos) {
    if (m.importe !== undefined) {
      const imp = Math.abs(m.importe);
      if (m.saldo !== undefined && saldoPrevio !== undefined) {
        if (Math.abs(round2(saldoPrevio + imp) - m.saldo) < 0.005) m.abono = imp;
        else if (Math.abs(round2(saldoPrevio - imp) - m.saldo) < 0.005) m.cargo = imp;
      }
      if (m.abono === undefined && m.cargo === undefined) {
        if (m.importe < 0) m.cargo = imp;
        else {
          m.abono = imp;
          if (metodo === 'saldo' && saldoPrevio === undefined) {
            advertencias.push(
              `No se encontró el saldo anterior: el movimiento del ${m.fecha.split('-').reverse().join('/')} por ${imp.toFixed(2)} se tomó como abono; verifícalo en la vista previa.`
            );
          }
        }
      }
    }
    if (m.saldo !== undefined) {
      if (saldoPrevio !== undefined) {
        const esperado = round2(saldoPrevio + (m.abono ?? 0) - (m.cargo ?? 0));
        if (Math.abs(esperado - m.saldo) > 0.005) saldosNoCuadran++;
      }
      saldoPrevio = m.saldo;
    } else if (saldoPrevio !== undefined) {
      saldoPrevio = round2(saldoPrevio + (m.abono ?? 0) - (m.cargo ?? 0));
    }
  }
  if (saldoInicial === undefined && crudos[0]?.saldo !== undefined) {
    saldoInicial = round2(crudos[0].saldo - (crudos[0].abono ?? 0) + (crudos[0].cargo ?? 0));
  }
  if (saldoFinal === undefined) {
    const conSaldo = [...crudos].reverse().find(m => m.saldo !== undefined);
    if (conSaldo) saldoFinal = conSaldo.saldo;
  }

  const movimientos = crudos
    .filter(m => (m.abono ?? 0) > 0 || (m.cargo ?? 0) > 0)
    .map(m =>
      nuevoMovimiento(
        'banco',
        {
          fecha: m.fecha,
          concepto: m.concepto.join(' ').replace(/\s+/g, ' ').trim() || '(sin concepto)',
          deposito: m.abono ?? 0,
          retiro: m.cargo ?? 0
        },
        opciones.periodoOrigen ?? 1
      )
    );

  const totalAbonos = round2(movimientos.reduce((a, m) => a + m.deposito, 0));
  const totalCargos = round2(movimientos.reduce((a, m) => a + m.retiro, 0));

  if (movimientos.length === 0) {
    advertencias.push('No se encontraron movimientos. Revisa que el PDF sea el estado de cuenta con la tabla de movimientos.');
  }
  if (saldosNoCuadran > 0) {
    advertencias.push(`${saldosNoCuadran} renglón(es) no cuadran con el saldo del estado de cuenta; revisa la vista previa.`);
  }
  if (saldoInicial !== undefined && saldoFinal !== undefined && movimientos.length) {
    const calc = round2(saldoInicial + totalAbonos - totalCargos);
    if (Math.abs(calc - saldoFinal) > 0.005) {
      advertencias.push(
        `Saldo inicial + abonos − cargos = ${calc.toFixed(2)}, pero el saldo final del estado de cuenta es ${saldoFinal.toFixed(2)} (diferencia ${round2(saldoFinal - calc).toFixed(2)}).`
      );
    }
  }
  const fueraDePeriodo = movimientos.filter(m => m.fecha.slice(0, 7) !== opciones.fechaCorte.slice(0, 7)).length;
  if (fueraDePeriodo) advertencias.push(`${fueraDePeriodo} movimiento(s) tienen fecha fuera del mes de la conciliación.`);

  return { movimientos, saldoInicial, saldoFinal, totalAbonos, totalCargos, saldosNoCuadran, metodo, advertencias };
}
