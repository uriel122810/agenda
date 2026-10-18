import assert from 'node:assert/strict';
import {
  conciliarAutomatico,
  conciliarManual,
  construirReporte,
  crearPeriodo,
  desconciliar,
  nuevoMovimiento,
  parseMovimientosCsv,
  procesarConciliacion,
  reabrirConciliacion,
  round2,
  saldoFinal,
  totalesLado
} from '../engine';
import { crearPeriodoDemo } from '../demo';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { construirHojaConciliacion } from '../hojaOficial';
import { nombreArchivoOficial, formatoPorDefecto } from '../formatoOficial';
import { generarExcelConciliacion } from '../excelOficial';
import { generarPdfAuxiliar, generarPdfConciliacionOficial, renglonesConcepto } from '../pdfOficial';
import { analizarAuxiliar, extraerConPdfjs } from '../importarAuxiliar';
import { combinarPeriodos } from '../store';

async function run() {
  console.log('🧪 Conciliación bancaria\n');

  // 1. Automática sobre datos demo: concilia los 34 pares, deja partidas sueltas
  const demo = crearPeriodoDemo();
  const { periodo: auto, nuevos } = conciliarAutomatico(demo);
  assert.equal(nuevos, 34, 'debe conciliar los 34 pares');
  assert.equal(totalesLado(auto, 'libros').noConciliados, 4);
  assert.equal(totalesLado(auto, 'banco').noConciliados, 4);
  console.log('✓ conciliación automática 1 a 1');

  // 2. El reporte cuadra: saldo banco ± partidas = saldo libros
  const rep = construirReporte(auto);
  assert.equal(rep.diferencia, 0, `diferencia esperada 0, obtenida ${rep.diferencia}`);
  assert.equal(rep.secciones[0].movimientos.length, 2); // comisiones banco
  assert.equal(rep.secciones[1].movimientos.length, 2); // depósitos en tránsito
  assert.equal(rep.secciones[2].movimientos.length, 2); // intereses + abono no identificado
  assert.equal(rep.secciones[3].movimientos.length, 2); // cheques en tránsito
  console.log('✓ reporte general cuadra con saldo en libros');

  // 3. Manual N a M con validación de importes
  let p = crearPeriodo({ cuentaId: 'x', empresa: 'E', banco: 'B', cuenta: '1', fechaCorte: '2026-06-30', saldoInicialLibros: 0, saldoInicialBanco: 0 });
  const l1 = nuevoMovimiento('libros', { fecha: '2026-06-02', concepto: 'Venta A', deposito: 100 }, 1);
  const l2 = nuevoMovimiento('libros', { fecha: '2026-06-03', concepto: 'Venta B', deposito: 50 }, 1);
  const b1 = nuevoMovimiento('banco', { fecha: '2026-06-04', concepto: 'Depósito agrupado', deposito: 150 }, 1);
  const b2 = nuevoMovimiento('banco', { fecha: '2026-06-05', concepto: 'Comisión', retiro: 10 }, 1);
  p = { ...p, movimientos: [l1, l2, b1, b2] };
  assert.throws(() => conciliarManual(p, [l1.id], [b1.id]), /no cuadran/);
  p = conciliarManual(p, [l1.id, l2.id], [b1.id]);
  assert.equal(p.grupos.length, 1);
  assert.equal(totalesLado(p, 'libros').conciliados, 2);
  const sinGrupo = desconciliar(p, l2.id);
  assert.equal(sinGrupo.grupos.length, 0);
  assert.equal(totalesLado(sinGrupo, 'libros').conciliados, 0);
  console.log('✓ conciliación manual N:M y des-conciliar');

  // 4. Procesar: cierra, arrastra pendientes y el siguiente periodo sigue cuadrando
  const { cerrado, siguiente } = procesarConciliacion(auto);
  assert.equal(cerrado.estado, 'cerrado');
  assert.throws(() => conciliarAutomatico(cerrado), /cerrado/);
  assert.equal(siguiente.numero, 2);
  assert.equal(siguiente.fechaCorte, '2026-07-31');
  assert.equal(siguiente.movimientos.length, 8);
  assert.ok(siguiente.movimientos.every(m => m.arrastrado && !m.conciliacionId));
  assert.equal(siguiente.saldoInicialLibros, saldoFinal(auto, 'libros'));
  assert.equal(siguiente.saldoInicialBanco, saldoFinal(auto, 'banco'));
  assert.equal(construirReporte(siguiente).diferencia, 0);

  // En julio el banco refleja el depósito en tránsito → al conciliarlo sigue cuadrando
  const transito = siguiente.movimientos.find(m => m.origen === 'libros' && m.deposito === 28947.96)!;
  const julio = {
    ...siguiente,
    movimientos: [...siguiente.movimientos, nuevoMovimiento('banco', { fecha: '2026-07-01', concepto: 'Depósito', deposito: 28947.96 }, 2)]
  };
  const julioAuto = conciliarAutomatico({ ...julio, criterios: { ...julio.criterios, toleranciaDias: 5 } }).periodo;
  assert.ok(julioAuto.movimientos.find(m => m.id === transito.id)!.conciliacionId);
  assert.equal(construirReporte(julioAuto).diferencia, 0);
  console.log('✓ procesar conciliación: cierre irreversible + arrastre de pendientes');

  // 4b. Reabrir: descarta la siguiente (abierta) y deja editable la cerrada
  {
    const { reabierto, descartar } = reabrirConciliacion(cerrado, siguiente);
    assert.equal(reabierto.estado, 'abierto');
    assert.equal(reabierto.cierre, undefined);
    assert.equal(descartar?.id, siguiente.id);
    assert.equal(reabierto.movimientos.length, cerrado.movimientos.length);
    assert.equal(conciliarAutomatico(reabierto).periodo.estado, 'abierto');
    const { cerrado: c2 } = procesarConciliacion(siguiente);
    assert.throws(() => reabrirConciliacion(cerrado, c2), /también está cerrada/);
    console.log('✓ reabrir una conciliación cerrada por error');
  }

  // 4c. Guardado: al combinar nube y navegador gana la versión más reciente
  {
    const viejo = { ...auto, actualizado: '2026-10-01T10:00:00.000Z' };
    const nuevo = { ...auto, movimientos: auto.movimientos.slice(0, 3), actualizado: '2026-10-02T10:00:00.000Z' };
    assert.equal(combinarPeriodos([viejo], [nuevo])[0].movimientos.length, 3);
    assert.equal(combinarPeriodos([nuevo], [viejo])[0].movimientos.length, 3);
    const otro = { ...siguiente, actualizado: '2026-10-01T00:00:00.000Z' };
    assert.equal(combinarPeriodos([viejo], [otro]).length, 2);
    console.log('✓ guardado: no regresan datos viejos de la nube');
  }

  // 5. Importación CSV (pegado desde Excel con tabulador y formato MX)
  const csv = 'Fecha\tConcepto\tReferencia\tCargo\tAbono\n01/06/2026\tPago de nomina REF-11306\tREF-11306\t\t39,250.00\n02/06/2026\tCobro factura\t\t$12,500.50\t\nxx\tmala\t\t1\t';
  const imp = parseMovimientosCsv(csv, 'libros', 1);
  assert.equal(imp.movimientos.length, 2);
  assert.equal(imp.movimientos[0].retiro, 39250);
  assert.equal(imp.movimientos[1].deposito, 12500.5);
  assert.equal(imp.movimientos[1].fecha, '2026-06-02');
  assert.equal(imp.errores.length, 1);
  const impBanco = parseMovimientosCsv('fecha,concepto,importe\n2026-06-03,Comision,-348\n2026-06-04,Interes,12.5', 'banco', 1);
  assert.equal(impBanco.movimientos[0].retiro, 348);
  assert.equal(impBanco.movimientos[1].deposito, 12.5);
  console.log('✓ importación CSV / pegado desde Excel');

  // 6. Formato oficial: hoja, Excel, PDF de conciliación y auxiliar
  const pub = join(process.cwd(), 'public', 'conciliacion');
  const recursos = {
    logoAyuntamiento: new Uint8Array(readFileSync(join(pub, 'logo-ayuntamiento.png'))),
    logoLaPaz: new Uint8Array(readFileSync(join(pub, 'logo-lapaz.png'))),
    logoAuxiliar: new Uint8Array(readFileSync(join(pub, 'logo-auxiliar.png'))),
    fuenteCalibri: new Uint8Array(readFileSync(join(pub, 'Carlito-Regular.ttf')))
  };
  const oficial = {
    ...auto,
    formato: {
      ...formatoPorDefecto(auto),
      nombreCuenta: 'BANAMEX PARTICIPACIONES',
      bancoCorto: 'BANAMEX',
      numeroCuenta: '01600731234',
      cuentaContable: '1112-15-0-0-01'
    },
    movimientos: auto.movimientos.map((m, i) => (m.origen === 'libros' ? { ...m, poliza: `E-${i + 1}`, mov: String((i % 3) + 1) } : m))
  };
  const hoja = construirHojaConciliacion(oficial);
  const celdas = hoja.filas.flatMap((f, i) => f.celdas.map(c => ({ ...c, fila: i + 1 })));
  const buscar = (t: string) => celdas.find(c => c.texto === t);
  assert.ok(buscar('CONCILIACIÓN BANCARIA'));
  assert.ok(buscar('CHEQUES EN TRÁNSITO'));
  const saldoLibros = celdas.find(c => c.texto?.startsWith('SALDO SEGÚN LIBROS AL 30 DE JUNIO DE 2026'))!;
  const totalLibros = celdas.find(c => c.fila === saldoLibros.fila && c.col === 5)!;
  assert.equal(totalLibros.numero, rep.saldoConciliado);
  assert.match(totalLibros.formula!, /^\+F\d+-F\d+\+F\d+$/);
  assert.equal(nombreArchivoOficial(oficial, 'CONC'), '01_26_06_CONC_BANAMEX_1234_PARTICIPACIONES');
  const xlsx = await generarExcelConciliacion(oficial, recursos);
  const pdfConc = await generarPdfConciliacionOficial(oficial, recursos);
  const pdfAux = await generarPdfAuxiliar(oficial, recursos);
  assert.ok(xlsx.length > 5000 && pdfConc.length > 5000 && pdfAux.length > 2000);
  console.log('✓ formato oficial: Excel, PDF de conciliación y auxiliar');

  // 7. Justificado del concepto del auxiliar (90 caracteres, como el sistema contable)
  const r = renglonesConcepto('PAGO DE FACT. 497 DE GRUPO CONSTRUCTOR RODJIM, S.A. DE C.V. TRASLADO DE RESIDUOS SOLIDOS EN GONDOLA DE 36 MTS. CUBICOS');
  assert.equal(r.length, 2);
  const ultimo = r[0][r[0].length - 1];
  assert.ok(Math.abs(ultimo.x + ultimo.t.length * 3.6 - 324) < 0.01, 'el primer renglón llega al ancho completo');
  console.log('✓ justificado de conceptos del auxiliar');

  // 8. Ida y vuelta: el auxiliar generado se vuelve a importar con los mismos datos
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfAux), verbosity: 0 }).promise;
  const leido = analizarAuxiliar(await extraerConPdfjs(doc as never));
  const libros = oficial.movimientos.filter(m => m.origen === 'libros' && !m.arrastrado);
  assert.equal(leido.movimientos.length, libros.length);
  assert.equal(leido.totalDebe, round2(libros.reduce((a, m) => a + m.deposito, 0)));
  assert.equal(leido.totalHaber, round2(libros.reduce((a, m) => a + m.retiro, 0)));
  assert.equal(leido.saldoInicial, oficial.saldoInicialLibros);
  assert.equal(leido.fechaCorte, '2026-06-30');
  assert.deepEqual(leido.advertencias, []);
  console.log('✓ importación del auxiliar en PDF (ida y vuelta)');

  console.log('\n✅ Todas las pruebas pasaron');
}

run().catch(err => {
  console.error('❌', err);
  process.exit(1);
});
