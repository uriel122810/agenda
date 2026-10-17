/**
 * PazSuma - Reportes PDF de Conciliación Bancaria (General y Detallado)
 */

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { sanitizePdfText } from '../pdfReportGenerator';
import { formatFecha, formatMoneda, type ReporteConciliacion } from './engine';

const VINO = rgb(0.345, 0.11, 0.184);
const DORADO = rgb(0.702, 0.588, 0.337);
const TEXTO = rgb(0.12, 0.15, 0.2);
const MUTED = rgb(0.4, 0.45, 0.55);
const FONDO = rgb(0.98, 0.96, 0.95);
const ROJO = rgb(0.75, 0.1, 0.1);
const VERDE = rgb(0.06, 0.5, 0.3);

const W = 612;
const H = 792;
const M = 48;

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  reporte: ReporteConciliacion;
  titulo: string;
}

function text(ctx: Ctx, s: string, x: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
  ctx.page.drawText(sanitizePdfText(s), {
    x,
    y: ctx.y,
    size: opts.size ?? 9,
    font: opts.bold ? ctx.bold : ctx.font,
    color: opts.color ?? TEXTO
  });
}

function textRight(ctx: Ctx, s: string, xRight: number, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
  const f = opts.bold ? ctx.bold : ctx.font;
  const clean = sanitizePdfText(s);
  const w = f.widthOfTextAtSize(clean, opts.size ?? 9);
  text(ctx, clean, xRight - w, opts);
}

function textCenter(ctx: Ctx, s: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) {
  const f = opts.bold ? ctx.bold : ctx.font;
  const clean = sanitizePdfText(s);
  const w = f.widthOfTextAtSize(clean, opts.size ?? 9);
  text(ctx, clean, (W - w) / 2, opts);
}

function truncar(ctx: Ctx, s: string, maxWidth: number, size = 8.5): string {
  let clean = sanitizePdfText(s);
  if (ctx.font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  while (clean.length > 3 && ctx.font.widthOfTextAtSize(clean + '...', size) > maxWidth) clean = clean.slice(0, -1);
  return clean + '...';
}

function encabezado(ctx: Ctx) {
  const r = ctx.reporte;
  ctx.page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: VINO });
  ctx.page.drawRectangle({ x: 0, y: H - 8, width: W, height: 2, color: DORADO });
  ctx.y = H - 44;
  textCenter(ctx, r.empresa, { size: 13, bold: true, color: VINO });
  ctx.y -= 16;
  textCenter(ctx, `Conciliación al: ${formatFecha(r.fechaCorte)}`, { size: 10, bold: true });
  ctx.y -= 14;
  textCenter(ctx, `${r.banco} ${r.cuenta}`, { size: 10, bold: true });
  ctx.y -= 14;
  textCenter(ctx, ctx.titulo, { size: 10, bold: true, color: VINO });
  ctx.y -= 13;
  textCenter(ctx, `Conciliación No. ${r.numero} - ${r.periodo}`, { size: 9, color: MUTED });
  ctx.y -= 10;
  ctx.page.drawLine({ start: { x: M, y: ctx.y }, end: { x: W - M, y: ctx.y }, thickness: 0.8, color: DORADO });
  ctx.y -= 20;
}

function nuevaPagina(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([W, H]);
  encabezado(ctx);
}

function asegurarEspacio(ctx: Ctx, alto: number) {
  if (ctx.y - alto < M + 20) nuevaPagina(ctx);
}

function pies(ctx: Ctx) {
  const pages = ctx.doc.getPages();
  pages.forEach((p, i) => {
    const s = sanitizePdfText(`PazSuma - ${ctx.titulo} - Página ${i + 1} de ${pages.length}`);
    p.drawText(s, { x: M, y: 28, size: 7.5, font: ctx.font, color: MUTED });
    const gen = sanitizePdfText(`Generado: ${new Date().toLocaleString('es-MX')}`);
    p.drawText(gen, { x: W - M - ctx.font.widthOfTextAtSize(gen, 7.5), y: 28, size: 7.5, font: ctx.font, color: MUTED });
  });
}

function filaTotal(ctx: Ctx, etiqueta: string, valor: number, opts: { destacado?: boolean; color?: ReturnType<typeof rgb> } = {}) {
  asegurarEspacio(ctx, 20);
  if (opts.destacado) {
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: W - 2 * M, height: 18, color: FONDO });
  }
  text(ctx, etiqueta, M + 6, { bold: true, size: 9.5, color: opts.color });
  textRight(ctx, formatMoneda(valor), W - M - 6, { bold: true, size: 9.5, color: opts.color });
  ctx.y -= opts.destacado ? 22 : 16;
}

function bloqueCuadre(ctx: Ctx) {
  const r = ctx.reporte;
  ctx.y -= 4;
  ctx.page.drawLine({ start: { x: M, y: ctx.y + 12 }, end: { x: W - M, y: ctx.y + 12 }, thickness: 0.6, color: MUTED });
  filaTotal(ctx, 'Saldo conciliado', r.saldoConciliado, { destacado: true, color: VINO });
  filaTotal(ctx, 'Saldo según libros', r.saldoLibros);
  const ok = Math.abs(r.diferencia) < 0.005;
  filaTotal(ctx, ok ? 'Diferencia (conciliación cuadrada)' : 'Diferencia por aclarar', r.diferencia, {
    destacado: true,
    color: ok ? VERDE : ROJO
  });
}

async function crearCtx(reporte: ReporteConciliacion, titulo: string): Promise<Ctx> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${titulo} - ${reporte.banco} ${reporte.cuenta} - ${reporte.periodo}`);
  doc.setAuthor('PazSuma');
  const ctx: Ctx = {
    doc,
    page: doc.addPage([W, H]),
    y: H,
    font: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    reporte,
    titulo
  };
  encabezado(ctx);
  return ctx;
}

export async function generarPdfReporteGeneral(reporte: ReporteConciliacion): Promise<Uint8Array> {
  const ctx = await crearCtx(reporte, 'Reporte General de Conciliación');
  filaTotal(ctx, 'Saldo según estado de cuenta', reporte.saldoBanco, { destacado: true });
  ctx.y -= 4;
  for (const s of reporte.secciones) {
    asegurarEspacio(ctx, 18);
    text(ctx, `( ${s.signo} )`, M + 6, { bold: true, color: VINO });
    text(ctx, s.titulo, M + 44);
    textRight(ctx, `${s.movimientos.length} mov.`, W - M - 110, { size: 8, color: MUTED });
    textRight(ctx, formatMoneda(s.total), W - M - 6);
    ctx.y -= 18;
  }
  bloqueCuadre(ctx);
  pies(ctx);
  return ctx.doc.save();
}

export async function generarPdfReporteDetallado(reporte: ReporteConciliacion): Promise<Uint8Array> {
  const ctx = await crearCtx(reporte, 'Reporte Detallado de Conciliación');
  filaTotal(ctx, 'Saldo según estado de cuenta', reporte.saldoBanco, { destacado: true });
  ctx.y -= 2;
  const colFecha = M + 6;
  const colConcepto = M + 70;
  const colImporte = W - M - 6;
  const anchoConcepto = colImporte - 90 - colConcepto;

  for (const s of reporte.secciones) {
    asegurarEspacio(ctx, 40);
    ctx.page.drawRectangle({ x: M, y: ctx.y - 5, width: W - 2 * M, height: 17, color: FONDO });
    text(ctx, `( ${s.signo} )  ${s.titulo}`, M + 6, { bold: true, color: VINO });
    ctx.y -= 18;
    if (s.movimientos.length === 0) {
      text(ctx, 'Sin partidas pendientes.', colConcepto, { size: 8.5, color: MUTED });
      ctx.y -= 14;
    }
    for (const m of s.movimientos) {
      asegurarEspacio(ctx, 14);
      const importe = m[s.campo];
      text(ctx, formatFecha(m.fecha), colFecha, { size: 8.5 });
      const concepto = m.referencia && !m.concepto.includes(m.referencia) ? `${m.concepto} (${m.referencia})` : m.concepto;
      text(ctx, truncar(ctx, concepto + (m.arrastrado ? '  [periodo ant.]' : ''), anchoConcepto), colConcepto, { size: 8.5 });
      textRight(ctx, formatMoneda(importe), colImporte - 90, { size: 8.5 });
      ctx.y -= 13;
    }
    asegurarEspacio(ctx, 18);
    ctx.page.drawLine({ start: { x: colImporte - 160, y: ctx.y + 9 }, end: { x: colImporte - 90, y: ctx.y + 9 }, thickness: 0.4, color: MUTED });
    text(ctx, `Total ${s.titulo.toLowerCase()}`, colConcepto, { size: 8.5, bold: true });
    textRight(ctx, formatMoneda(s.total), colImporte, { size: 9, bold: true });
    ctx.y -= 20;
  }
  bloqueCuadre(ctx);
  pies(ctx);
  return ctx.doc.save();
}
