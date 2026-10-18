/**
 * PDFs del formato oficial:
 *  - Conciliación Bancaria: impresión de la hoja oficial tal como la imprime Excel
 *    (carta vertical, márgenes 0.7"/0.75", ajustada a 1 página de ancho).
 *  - Auxiliares del mes: réplica del reporte del sistema contable
 *    (carta horizontal, Courier, mismas columnas y paginación "Hoja n de N").
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { round2, saldoFinal, type Movimiento, type PeriodoConciliacion, type SegmentoConcepto } from './engine';
import {
  construirHojaConciliacion,
  anchosImpresionPt,
  alineacion,
  textoVisible,
  ALTO_FILA,
  type CeldaHoja,
  type FuenteHoja
} from './hojaOficial';
import { fechaDMYCorta, formatoDe, MESES_MAYUS, numeroMX, type CuentaJerarquia } from './formatoOficial';
import type { RecursosOficiales } from './assets';

const NEGRO = rgb(0, 0, 0);

/** Sustituye caracteres que no existen en WinAnsi (fuentes estándar de PDF) */
function winAnsi(s: string): string {
  return s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

// ══════════════════════════════════════════════════════════════════════════════
// Conciliación bancaria
// ══════════════════════════════════════════════════════════════════════════════

const CARTA_V = { w: 612, h: 792 };
const MARGEN_IZQ = 0.7 * 72;
const MARGEN_DER = 0.7 * 72;
const MARGEN_SUP = 0.75 * 72;

interface FuentesConc {
  arial: PDFFont;
  arialBold: PDFFont;
  calibri: PDFFont;
}

function fuenteDe(f: FuentesConc, nombre: FuenteHoja, negrita?: boolean): PDFFont {
  if (nombre === 'Calibri') return f.calibri;
  return negrita ? f.arialBold : f.arial;
}

function tieneValor(c: CeldaHoja): boolean {
  return !!(c.fecha || typeof c.numero === 'number' || (c.texto !== undefined && c.texto !== ''));
}

function recortar(texto: string, font: PDFFont, size: number, max: number): string {
  if (font.widthOfTextAtSize(texto, size) <= max) return texto;
  let t = texto;
  while (t.length > 0 && font.widthOfTextAtSize(t, size) > max) t = t.slice(0, -1);
  return t;
}

export async function generarPdfConciliacionOficial(
  p: PeriodoConciliacion,
  recursos: Pick<RecursosOficiales, 'logoAyuntamiento' | 'logoLaPaz' | 'fuenteCalibri'>
): Promise<Uint8Array> {
  const hoja = construirHojaConciliacion(p);
  const doc = await PDFDocument.create();
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  doc.registerFontkit(fontkit);
  const f = formatoDe(p);
  doc.setTitle(`Conciliación bancaria ${f.nombreCuenta} ${p.fechaCorte}`);
  doc.setAuthor('PazSuma');
  const fuentes: FuentesConc = {
    arial: await doc.embedFont(StandardFonts.Helvetica),
    arialBold: await doc.embedFont(StandardFonts.HelveticaBold),
    calibri: await doc.embedFont(recursos.fuenteCalibri)
  };

  // Geometría de impresión y escala de "ajustar a 1 página de ancho" (porcentaje entero, como Excel)
  const colPt = anchosImpresionPt();
  const anchoTotal = colPt.reduce((a, b) => a + b, 0);
  const disponible = CARTA_V.w - MARGEN_IZQ - MARGEN_DER;
  const s = Math.min(1, Math.floor((disponible / anchoTotal) * 100) / 100);
  const colX: number[] = [];
  colPt.reduce((x, w, i) => ((colX[i] = x), x + w), 0);

  // Paginación vertical (normalmente cabe en una página)
  const altoUtil = (CARTA_V.h - 2 * MARGEN_SUP) / s;
  const paginas: Array<{ desde: number; hasta: number }> = [];
  let acumulado = 0;
  let desde = 0;
  hoja.filas.forEach((fila, i) => {
    const alto = fila.alto ?? ALTO_FILA;
    if (acumulado + alto > altoUtil && i > desde) {
      paginas.push({ desde, hasta: i });
      desde = i;
      acumulado = 0;
    }
    acumulado += alto;
  });
  paginas.push({ desde, hasta: hoja.filas.length });

  const logoA = await doc.embedPng(recursos.logoAyuntamiento);
  const logoB = await doc.embedPng(recursos.logoLaPaz);

  for (const pag of paginas) {
    const page = doc.addPage([CARTA_V.w, CARTA_V.h]);
    // coordenadas: x en pt sin escalar desde el margen; y = distancia desde el margen superior
    const X = (x: number) => MARGEN_IZQ + x * s;
    const Y = (top: number) => CARTA_V.h - MARGEN_SUP - top * s;

    const filaTop: number[] = [];
    let y = 0;
    for (let i = pag.desde; i < pag.hasta; i++) {
      filaTop[i] = y;
      y += hoja.filas[i].alto ?? ALTO_FILA;
    }

    if (pag.desde === 0) {
      for (const img of hoja.imagenes) {
        const png = img.archivo === 'logo-ayuntamiento.png' ? logoA : logoB;
        const x = colX[img.col] + img.offX * 0.75;
        const top = filaTop[img.fila] + img.offY * 0.75;
        const w = img.ancho * 0.75;
        const h = img.alto * 0.75;
        page.drawImage(png, { x: X(x), y: Y(top + h), width: w * s, height: h * s });
      }
    }

    for (let i = pag.desde; i < pag.hasta; i++) {
      const fila = hoja.filas[i];
      const top = filaTop[i];
      const alto = fila.alto ?? ALTO_FILA;
      const ocupadas = new Set(fila.celdas.filter(tieneValor).map(c => c.col));

      for (const c of fila.celdas) {
        const span = c.span ?? 1;
        const x0 = colX[c.col];
        const ancho = colPt.slice(c.col, c.col + span).reduce((a, b) => a + b, 0);
        dibujarBordes(page, c, X, Y, x0, top, ancho, alto, s);

        const texto = winAnsi(textoVisible(c));
        if (!texto.trim()) continue;
        const font = fuenteDe(fuentes, c.fuente, c.negrita);
        const size = c.tam;
        const pad = 1; // margen interno de la celda
        const al = alineacion(c);
        let tx: number;
        let visible = texto;
        if (al === 'left') {
          // El texto se desborda hacia celdas vacías a la derecha (como en Excel)
          let fin = c.col + span;
          while (fin < colPt.length && !ocupadas.has(fin)) fin++;
          const max = colX[fin - 1] + colPt[fin - 1] - x0 - pad;
          visible = recortar(texto, font, size, max);
          tx = x0 + pad;
        } else if (al === 'right') {
          tx = x0 + ancho - pad - font.widthOfTextAtSize(texto, size);
        } else {
          tx = x0 + (ancho - font.widthOfTextAtSize(texto, size)) / 2;
        }
        // Alineación vertical inferior (por omisión en Excel)
        const descenso = c.fuente === 'Calibri' ? 0.25 : 0.212;
        const base = top + alto - 1.5 - descenso * size;
        page.drawText(visible, { x: X(tx), y: Y(base), size: size * s, font, color: NEGRO });
      }
    }
  }
  return doc.save();
}

function dibujarBordes(
  page: PDFPage,
  c: CeldaHoja,
  X: (x: number) => number,
  Y: (y: number) => number,
  x0: number,
  top: number,
  ancho: number,
  alto: number,
  s: number
) {
  if (!c.bordes) return;
  const grosor = (b: string) => (b === 'medium' ? 1.5 : 0.75) * s;
  const linea = (xa: number, ya: number, xb: number, yb: number, b: string) =>
    page.drawLine({ start: { x: X(xa), y: Y(ya) }, end: { x: X(xb), y: Y(yb) }, thickness: grosor(b), color: NEGRO });
  const { t, b, l, r } = c.bordes;
  if (t) linea(x0, top, x0 + ancho, top, t);
  if (b) linea(x0, top + alto, x0 + ancho, top + alto, b);
  if (l) linea(x0, top, x0, top + alto, l);
  if (r) linea(x0 + ancho, top, x0 + ancho, top + alto, r);
}

// ══════════════════════════════════════════════════════════════════════════════
// Auxiliares del mes
// ══════════════════════════════════════════════════════════════════════════════

const CARTA_H = { w: 792, h: 612 };
const CHAR6 = 3.6; // ancho de un carácter Courier a 6 pt
const MAX_CONCEPTO = 90; // caracteres por renglón de concepto
const AUX = {
  // posiciones medidas sobre el reporte original (pt, distancia desde el borde superior)
  logo: { x: 37.4, top: 37.4, w: 54, h: 26.5 },
  titulo: { top: 60.14, size: 16, centro: 395.08 },
  linea: { top: 100.4, x0: 32.8, x1: 757.4 },
  entidad: { x: 32.84, top: 104.77, size: 12 },
  periodo: { derecha: 756, top: 104.58, size: 10 },
  caja: { x0: 32.8, top: 118.4, x1: 757.4, bottom: 140.9 },
  pie: { top: 575.91, size: 8 },
  inicioPrimera: 145.4,
  inicioSiguientes: 140.68,
  limite: 566,
  paso: { jerarquia: 13.5, trasJerarquia: 8.76, renglon: 6.35, movimiento: 9 },
  col: {
    codigo: 32.84,
    nombre: 131.84,
    movCentro: 41.16,
    poliza: 55.36,
    fecha: 86.84,
    // borde derecho de cada importe (las cifras terminan un carácter antes del límite de 18 posiciones)
    siDebe: 393.76,
    siHaber: 465.76,
    mDebe: 537.76,
    mHaber: 609.76,
    sfDebe: 681.76,
    sfHaber: 753.76
  }
};

/** Posición de la línea base a partir del borde superior del texto (calibrado contra el reporte original) */
const baseDesdeTop = (top: number, size: number) => CARTA_H.h - top - 0.806 * size;

/**
 * Divide el concepto en renglones de 90 caracteres y los justifica como el sistema contable:
 * todos menos el último se estiran al ancho completo repartiendo el espacio sobrante entre palabras.
 * Devuelve fragmentos con su posición x (pt desde la columna de concepto).
 */
export function renglonesConcepto(texto: string, ancho = MAX_CONCEPTO): SegmentoConcepto[][] {
  const palabras = texto.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lineas: string[][] = [];
  let actual: string[] = [];
  let largo = 0;
  for (let w of palabras) {
    while (w.length > ancho) {
      if (actual.length) {
        lineas.push(actual);
        actual = [];
        largo = 0;
      }
      lineas.push([w.slice(0, ancho)]);
      w = w.slice(ancho);
    }
    const extra = actual.length ? 1 : 0;
    if (largo + extra + w.length > ancho) {
      lineas.push(actual);
      actual = [w];
      largo = w.length;
    } else {
      actual.push(w);
      largo += extra + w.length;
    }
  }
  if (actual.length) lineas.push(actual);
  const anchoPt = ancho * CHAR6;
  return lineas.map((ws, i) => {
    if (i === lineas.length - 1 || ws.length < 2) return [{ x: 0, t: ws.join(' ') }];
    const letras = ws.reduce((a, w) => a + w.length, 0) * CHAR6;
    const hueco = (anchoPt - letras) / (ws.length - 1);
    let x = 0;
    return ws.map(w => {
      const seg = { x: Math.round(x * 100) / 100, t: w };
      x += w.length * CHAR6 + hueco;
      return seg;
    });
  });
}

/** Texto plano de un renglón (para vistas previas) */
export function textoRenglon(segs: SegmentoConcepto[]): string {
  let out = '';
  for (const sg of segs) {
    const col = Math.round(sg.x / CHAR6);
    out = out.length < col ? out.padEnd(col, ' ') + sg.t : out + (out ? ' ' : '') + sg.t;
  }
  return out;
}

const ORDEN_POLIZA: Record<string, number> = { I: 0, E: 1, D: 2 };

/** Orden del auxiliar: Ingresos, Egresos, Diario; luego número de póliza */
export function ordenarAuxiliar(movs: Movimiento[]): Movimiento[] {
  const clave = (m: Movimiento) => {
    const mt = (m.poliza ?? '').toUpperCase().match(/^([A-Z]+)\s*-?\s*(\d+)/);
    return { tipo: mt ? (ORDEN_POLIZA[mt[1]] ?? 3) : 4, num: mt ? Number(mt[2]) : 0 };
  };
  return movs
    .map((m, i) => ({ m, i, k: clave(m) }))
    .sort((a, b) => a.k.tipo - b.k.tipo || a.k.num - b.k.num || a.i - b.i)
    .map(x => x.m);
}

export function esCuentaMayor(codigo: string): boolean {
  const g = codigo.trim().split(/\s+/);
  return g.length === 1 || (g.length === 2 && /^0+$/.test(g[1]));
}

/** "1112-15-0-0-01" → "1112 0015 0000 0000 0001" */
export function codigoAuxiliar(cuentaContable: string): string {
  const partes = cuentaContable.split(/[-\s]+/).filter(Boolean);
  if (partes.length === 0) return '';
  return [partes[0], ...partes.slice(1).map(x => x.padStart(4, '0'))].join(' ');
}

export function jerarquiaAuxiliar(p: PeriodoConciliacion): CuentaJerarquia[] {
  const f = formatoDe(p);
  const lista = [...f.jerarquia];
  const detalle = codigoAuxiliar(f.cuentaContable);
  if (detalle && !lista.some(c => c.codigo.replace(/\s+/g, ' ') === detalle)) {
    lista.push({ codigo: detalle, nombre: f.nombreCuenta });
  }
  return lista;
}

export async function generarPdfAuxiliar(
  p: PeriodoConciliacion,
  recursos: Pick<RecursosOficiales, 'logoAuxiliar'>
): Promise<Uint8Array> {
  const f = formatoDe(p);
  const doc = await PDFDocument.create();
  doc.setTitle(`Auxiliares del mes ${f.nombreCuenta} ${p.fechaCorte}`);
  doc.setAuthor('PazSuma');
  const courier = await doc.embedFont(StandardFonts.Courier);
  const courierB = await doc.embedFont(StandardFonts.CourierBold);
  const logo = await doc.embedPng(recursos.logoAuxiliar);

  const movs = ordenarAuxiliar(p.movimientos.filter(m => m.origen === 'libros' && !m.arrastrado));
  const totalDebe = round2(movs.reduce((a, m) => a + m.deposito, 0));
  const totalHaber = round2(movs.reduce((a, m) => a + m.retiro, 0));
  const saldoIni = round2(p.saldoInicialLibros);
  const saldoFin = saldoFinal(p, 'libros');

  type Renglon =
    | { tipo: 'jerarquia'; codigo: string; nombre: string }
    | { tipo: 'mov'; m: Movimiento; segmentos: SegmentoConcepto[]; primero: boolean }
  ;
  const renglones: Renglon[] = [
    ...jerarquiaAuxiliar(p).map(c => ({ tipo: 'jerarquia' as const, codigo: c.codigo, nombre: c.nombre })),
    ...movs.flatMap(m =>
      (m.conceptoRenglones?.length ? m.conceptoRenglones : renglonesConcepto(m.concepto)).map((segmentos, i) => ({
        tipo: 'mov' as const,
        m,
        segmentos,
        primero: i === 0
      }))
    )
  ];

  // Posiciones verticales y paginación. Un movimiento de un solo renglón (en la hoja actual) ocupa 9 pt;
  // uno de varios renglones avanza 6.35 pt por renglón.
  const ubicados: Array<{ r: Renglon; pagina: number; top: number }> = [];
  let pagina = 0;
  let top = AUX.inicioPrimera;
  let anterior: Renglon | null = null;
  let renglonesEnHoja = 0; // renglones del movimiento anterior impresos en la hoja actual
  for (const r of renglones) {
    if (anterior) {
      let paso: number;
      if (anterior.tipo === 'jerarquia') paso = r.tipo === 'jerarquia' ? AUX.paso.jerarquia : AUX.paso.trasJerarquia;
      else if (r.tipo === 'mov' && !r.primero) paso = AUX.paso.renglon;
      else paso = renglonesEnHoja > 1 ? AUX.paso.renglon : AUX.paso.movimiento;
      top += paso;
      if (top > AUX.limite) {
        pagina++;
        top = AUX.inicioSiguientes;
        renglonesEnHoja = 0;
      }
    }
    if (r.tipo === 'mov') renglonesEnHoja = r.primero ? 1 : renglonesEnHoja + 1;
    ubicados.push({ r, pagina, top });
    anterior = r;
  }
  const totalPaginas = pagina + 1;

  const [y, m] = p.fechaCorte.split('-').map(Number);
  const ultimoDia = Number(p.fechaCorte.slice(8, 10));
  const textoPeriodo = `DEL  1  AL  ${ultimoDia}  DE  ${MESES_MAYUS[m - 1]}  DE ${y} `;

  const paginas: PDFPage[] = [];
  for (let i = 0; i < totalPaginas; i++) {
    const page = doc.addPage([CARTA_H.w, CARTA_H.h]);
    paginas.push(page);
    const t = (texto: string, x: number, tp: number, size: number, bold = false) =>
      page.drawText(winAnsi(texto), { x, y: baseDesdeTop(tp, size), size, font: bold ? courierB : courier, color: NEGRO });

    page.drawImage(logo, { x: AUX.logo.x, y: CARTA_H.h - AUX.logo.top - AUX.logo.h, width: AUX.logo.w, height: AUX.logo.h });
    const titulo = 'AUXILIARES DEL MES';
    t(titulo, AUX.titulo.centro - (titulo.length * 0.6 * AUX.titulo.size) / 2, AUX.titulo.top, AUX.titulo.size, true);
    page.drawLine({
      start: { x: AUX.linea.x0, y: CARTA_H.h - AUX.linea.top },
      end: { x: AUX.linea.x1, y: CARTA_H.h - AUX.linea.top },
      thickness: 0.5,
      color: NEGRO
    });
    t(`ENTIDAD: ${f.entidad}`, AUX.entidad.x, AUX.entidad.top, AUX.entidad.size);
    t(textoPeriodo, AUX.periodo.derecha - textoPeriodo.length * 0.6 * AUX.periodo.size, AUX.periodo.top, AUX.periodo.size);
    page.drawRectangle({
      x: AUX.caja.x0,
      y: CARTA_H.h - AUX.caja.bottom,
      width: AUX.caja.x1 - AUX.caja.x0,
      height: AUX.caja.bottom - AUX.caja.top,
      borderColor: NEGRO,
      borderWidth: 0.5
    });
    t('SALDO INICIAL', 366.16, 118.23, 8);
    t('MOVIMIENTOS DEL MES', 495.76, 118.23, 8);
    t('SALDO FINAL', 658.96, 118.23, 8);
    t('CUENTA', 58.96, 122.75, 8);
    t('CONCEPTO', 200.4, 122.75, 8);
    for (const [x, txt] of [[353.32, 'DEBE'], [422.92, 'HABER'], [497.32, 'DEBE'], [566.92, 'HABER'], [641.32, 'DEBE'], [710.92, 'HABER']] as const) {
      t(txt, x, 127.23, 8);
    }
    t('MOV-POL-FECHA', 42.16, 131.75, 8);
    const pie = `Hoja ${i + 1} de ${totalPaginas}`;
    t(pie, CARTA_H.w / 2 - (pie.length * 0.6 * AUX.pie.size) / 2, AUX.pie.top, AUX.pie.size);
  }

  const importe = (page: PDFPage, valor: number, derecha: number, tp: number, bold: boolean) => {
    if (!valor) return;
    const txt = numeroMX(valor);
    page.drawText(txt, { x: derecha - txt.length * CHAR6, y: baseDesdeTop(tp, 6), size: 6, font: bold ? courierB : courier, color: NEGRO });
  };
  const saldo = (page: PDFPage, valor: number, colDebe: number, colHaber: number, tp: number) => {
    if (valor >= 0) importe(page, valor, colDebe, tp, true);
    else importe(page, -valor, colHaber, tp, true);
  };

  for (const { r, pagina: pg, top: tp } of ubicados) {
    const page = paginas[pg];
    const t = (texto: string, x: number, bold = false) =>
      page.drawText(winAnsi(texto), { x, y: baseDesdeTop(tp, 6), size: 6, font: bold ? courierB : courier, color: NEGRO });
    if (r.tipo === 'jerarquia') {
      t(r.codigo, AUX.col.codigo, true);
      t(r.nombre, AUX.col.nombre, true);
      saldo(page, saldoIni, AUX.col.siDebe, AUX.col.siHaber, tp);
      // En las cuentas de mayor (1000, 1100, 1110, 1112 0000) el sistema imprime los movimientos
      // del mes un carácter más a la derecha que en las subcuentas
      const corr = esCuentaMayor(r.codigo) ? CHAR6 : 0;
      importe(page, totalDebe, AUX.col.mDebe + corr, tp, true);
      importe(page, totalHaber, AUX.col.mHaber + corr, tp, true);
      saldo(page, saldoFin, AUX.col.sfDebe, AUX.col.sfHaber, tp);
      continue;
    }
    if (r.primero) {
      const mov = r.m.mov ?? '';
      if (mov) t(mov, AUX.col.movCentro - (mov.length * CHAR6) / 2);
      t(r.m.poliza ?? '', AUX.col.poliza);
      t(fechaDMYCorta(r.m.fecha), AUX.col.fecha);
      importe(page, r.m.deposito, AUX.col.mDebe, tp, false);
      importe(page, r.m.retiro, AUX.col.mHaber, tp, false);
    }
    for (const sg of r.segmentos) t(sg.t, AUX.col.nombre + sg.x);
  }

  return doc.save();
}
