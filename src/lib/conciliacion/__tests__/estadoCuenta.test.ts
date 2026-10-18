import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { analizarEstadoCuenta, interpretarFecha } from '../importarEstadoCuenta';
import { extraerConPdfjs } from '../importarAuxiliar';

type Fila = { fecha: string; concepto: string[]; cargo?: number; abono?: number };

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Genera un estado de cuenta de prueba con el diseño indicado */
async function estadoCuenta(
  filas: Fila[],
  diseno: 'columnas' | 'importe',
  opts: { saldoInicial: number; fechaTexto?: (f: string) => string; porHoja?: number }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const porHoja = opts.porHoja ?? 18;
  let saldo = opts.saldoInicial;
  const derecha = (page: ReturnType<typeof doc.addPage>, txt: string, x1: number, y: number, f = font) =>
    page.drawText(txt, { x: x1 - f.widthOfTextAtSize(txt, 8), y, size: 8, font: f });
  let totalA = 0;
  let totalC = 0;
  for (let h = 0; h * porHoja < filas.length; h++) {
    const page = doc.addPage([612, 792]);
    let y = 740;
    page.drawText('BANCO DE PRUEBA S.A.  ESTADO DE CUENTA', { x: 40, y, size: 11, font: bold });
    y -= 16;
    page.drawText('Periodo: 01/08/2026 al 31/08/2026     Cuenta: 0000001234', { x: 40, y, size: 8, font });
    y -= 14;
    if (h === 0) {
      page.drawText('Saldo anterior', { x: 40, y, size: 8, font });
      derecha(page, fmt(opts.saldoInicial), 300, y);
      y -= 12;
      page.drawText('Depósitos 999,999.99 Retiros 888,888.88', { x: 40, y, size: 8, font });
      y -= 20;
    }
    if (diseno === 'columnas') {
      page.drawText('FECHA', { x: 40, y, size: 8, font: bold });
      page.drawText('DESCRIPCIÓN', { x: 100, y, size: 8, font: bold });
      derecha(page, 'RETIROS', 420, y, bold);
      derecha(page, 'DEPÓSITOS', 495, y, bold);
      derecha(page, 'SALDO', 570, y, bold);
    } else {
      page.drawText('Fecha', { x: 40, y, size: 8, font: bold });
      page.drawText('Concepto', { x: 100, y, size: 8, font: bold });
      derecha(page, 'Importe', 470, y, bold);
      derecha(page, 'Saldo', 570, y, bold);
    }
    y -= 14;
    for (const f of filas.slice(h * porHoja, (h + 1) * porHoja)) {
      saldo += (f.abono ?? 0) - (f.cargo ?? 0);
      totalA += f.abono ?? 0;
      totalC += f.cargo ?? 0;
      const fechaTxt = opts.fechaTexto ? opts.fechaTexto(f.fecha) : f.fecha.split('-').reverse().join('/');
      page.drawText(fechaTxt, { x: 40, y, size: 8, font });
      page.drawText(f.concepto[0], { x: 100, y, size: 8, font });
      if (diseno === 'columnas') {
        if (f.cargo) derecha(page, fmt(f.cargo), 420, y);
        if (f.abono) derecha(page, fmt(f.abono), 495, y);
      } else {
        derecha(page, (f.cargo ? '-' : '') + fmt(f.cargo ?? f.abono ?? 0), 470, y);
      }
      derecha(page, fmt(saldo), 570, y);
      for (const extra of f.concepto.slice(1)) {
        y -= 10;
        page.drawText(extra, { x: 100, y, size: 8, font });
      }
      y -= 14;
    }
    page.drawText(`Página ${h + 1}`, { x: 290, y: 30, size: 7, font });
  }
  const last = doc.getPages()[doc.getPageCount() - 1];
  last.drawText('Saldo final', { x: 40, y: 80, size: 8, font });
  last.drawText(fmt(saldo), { x: 300 - font.widthOfTextAtSize(fmt(saldo), 8), y: 80, size: 8, font });
  last.drawText(`Total depósitos ${fmt(totalA)}`, { x: 40, y: 68, size: 8, font });
  return doc.save();
}

async function leer(bytes: Uint8Array) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: bytes, verbosity: 0 }).promise;
  return extraerConPdfjs(doc as never);
}

function filasPrueba(n: number): Fila[] {
  const out: Fila[] = [];
  for (let i = 0; i < n; i++) {
    const dia = String(1 + (i % 28)).padStart(2, '0');
    const cargo = i % 3 !== 0;
    const monto = Math.round((1000 + ((i * 7919) % 900000)) * 100) / 100 + 0.37;
    out.push({
      fecha: `2026-08-${dia}`,
      concepto: i % 4 === 0 ? [`SPEI RECIBIDO REF ${100000 + i}`, `ORDENANTE GOBIERNO DEL ESTADO`] : [`TRANSFERENCIA SPEI PAGO ${i} PROVEEDOR`],
      cargo: cargo ? monto : undefined,
      abono: cargo ? undefined : monto
    });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function run() {
  console.log('🧪 Importación de estado de cuenta en PDF\n');

  assert.equal(interpretarFecha('01/08/2026', 2026, 8), '2026-08-01');
  assert.equal(interpretarFecha('1-8-26', 2026, 8), '2026-08-01');
  assert.equal(interpretarFecha('01-AGO-2026', 2026, 8), '2026-08-01');
  assert.equal(interpretarFecha('15 AGO', 2026, 8), '2026-08-15');
  assert.equal(interpretarFecha('31DIC', 2027, 1), '2026-12-31');
  assert.equal(interpretarFecha('REF', 2026, 8), null);
  console.log('✓ formatos de fecha');

  const filas = filasPrueba(45);
  const totalA = filas.reduce((a, f) => a + (f.abono ?? 0), 0);
  const totalC = filas.reduce((a, f) => a + (f.cargo ?? 0), 0);

  // A) Columnas Retiros / Depósitos / Saldo, conceptos de 2 renglones, 3 hojas
  const a = analizarEstadoCuenta(await leer(await estadoCuenta(filas, 'columnas', { saldoInicial: 25000000 })), { fechaCorte: '2026-08-31' });
  assert.equal(a.metodo, 'columnas');
  assert.equal(a.movimientos.length, 45);
  assert.equal(a.totalAbonos, Math.round(totalA * 100) / 100);
  assert.equal(a.totalCargos, Math.round(totalC * 100) / 100);
  assert.equal(a.saldoInicial, 25000000);
  assert.equal(a.saldosNoCuadran, 0);
  assert.deepEqual(a.advertencias, []);
  assert.equal(a.movimientos[0].concepto, 'SPEI RECIBIDO REF 100000 ORDENANTE GOBIERNO DEL ESTADO');
  console.log('✓ columnas separadas de retiros y depósitos (3 hojas, conceptos de varios renglones)');

  // B) Una sola columna de importe + saldo: cargo/abono por variación de saldo
  const b = analizarEstadoCuenta(await leer(await estadoCuenta(filas, 'importe', { saldoInicial: 25000000 })), { fechaCorte: '2026-08-31' });
  assert.equal(b.metodo, 'saldo');
  assert.equal(b.movimientos.length, 45);
  assert.equal(b.totalAbonos, Math.round(totalA * 100) / 100);
  assert.equal(b.totalCargos, Math.round(totalC * 100) / 100);
  assert.equal(b.saldosNoCuadran, 0);
  assert.deepEqual(b.advertencias, []);
  console.log('✓ columna única de importe (cargo/abono por saldo)');

  // C) Fechas tipo "15 AGO"
  const meses = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const c = analizarEstadoCuenta(
    await leer(await estadoCuenta(filas.slice(0, 12), 'columnas', { saldoInicial: 1000, fechaTexto: f => `${f.slice(8)} ${meses[+f.slice(5, 7)]}` })),
    { fechaCorte: '2026-08-31' }
  );
  assert.equal(c.movimientos.length, 12);
  assert.equal(c.movimientos[3].fecha, filas[3].fecha);
  assert.deepEqual(c.advertencias, []);
  console.log('✓ fechas con mes abreviado');

  // D) PDF sin texto (escaneado)
  const vacio = await PDFDocument.create();
  vacio.addPage();
  const d = analizarEstadoCuenta(await leer(await vacio.save()), { fechaCorte: '2026-08-31' });
  assert.equal(d.movimientos.length, 0);
  assert.match(d.advertencias[0], /escaneada/);
  console.log('✓ aviso de PDF escaneado');

  console.log('\n✅ Todas las pruebas pasaron');
}

run().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
