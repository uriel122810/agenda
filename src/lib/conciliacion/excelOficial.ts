/**
 * Genera la Conciliación Bancaria en Excel (.xlsx) con el formato oficial,
 * a partir del modelo de hojaOficial.ts (mismas celdas, estilos y fórmulas).
 */

import type { Borders, Workbook } from 'exceljs';
import type { PeriodoConciliacion } from './engine';
import { construirHojaConciliacion, ALTO_FILA, type Borde, type CeldaHoja } from './hojaOficial';
import type { RecursosOficiales } from './assets';

const COLS = 'ABCDEFGH';

function fechaUTC(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function bordes(b: CeldaHoja['bordes']): Partial<Borders> | undefined {
  if (!b) return undefined;
  const s = (x?: Borde) => (x ? { style: x } : undefined);
  const out: Partial<Borders> = {};
  if (b.t) out.top = s(b.t);
  if (b.b) out.bottom = s(b.b);
  if (b.l) out.left = s(b.l);
  if (b.r) out.right = s(b.r);
  return out;
}

export async function generarExcelConciliacion(
  p: PeriodoConciliacion,
  recursos: Pick<RecursosOficiales, 'logoAyuntamiento' | 'logoLaPaz'>
): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const hoja = construirHojaConciliacion(p);
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = 'PazSuma';
  wb.created = new Date();

  const ws = wb.addWorksheet('Hoja1', {
    properties: { defaultRowHeight: ALTO_FILA },
    pageSetup: {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      scale: 65,
      margins: { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
    }
  });

  hoja.anchos.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  hoja.filas.forEach((fila, idx) => {
    const r = ws.getRow(idx + 1);
    if (fila.alto) r.height = fila.alto;
    for (const c of fila.celdas) {
      const cell = r.getCell(c.col + 1);
      if (c.formula) {
        const result = c.fecha ? fechaUTC(c.fecha) : c.numero;
        cell.value = { formula: c.formula, result } as never;
      } else if (c.fecha) {
        cell.value = fechaUTC(c.fecha);
      } else if (typeof c.numero === 'number') {
        cell.value = c.numero;
      } else if (c.texto !== undefined) {
        cell.value = c.texto;
      }
      cell.font = { name: c.fuente, size: c.tam, bold: c.negrita || undefined };
      if (c.numFmt && c.numFmt !== 'General') cell.numFmt = c.numFmt;
      if (c.alin) cell.alignment = { horizontal: c.alin };
      const b = bordes(c.bordes);
      if (b) cell.border = b;
      if (c.span && c.span > 1) {
        const ref = `${COLS[c.col]}${idx + 1}:${COLS[c.col + c.span - 1]}${idx + 1}`;
        ws.mergeCells(ref);
      }
    }
  });

  // Logos (recortes del logotipo institucional, mismo tamaño y posición que la plantilla)
  const EMU = 9525; // EMU por píxel
  for (const img of hoja.imagenes) {
    const buffer = img.archivo === 'logo-ayuntamiento.png' ? recursos.logoAyuntamiento : recursos.logoLaPaz;
    const id = wb.addImage({ buffer: buffer as never, extension: 'png' });
    ws.addImage(id, {
      tl: { nativeCol: img.col, nativeColOff: img.offX * EMU, nativeRow: img.fila, nativeRowOff: img.offY * EMU } as never,
      ext: { width: img.ancho, height: img.alto },
      editAs: 'oneCell'
    });
  }

  ws.views = [{ state: 'normal', showGridLines: true }];
  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as ArrayBuffer);
}
