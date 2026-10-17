/**
 * Datos de ejemplo para probar el módulo de Conciliación Bancaria.
 * Genera un mes de movimientos de Libros y Estado de cuenta (determinístico)
 * con partidas en tránsito, comisiones e intereses no registrados, etc.
 */

import { crearPeriodo, nuevoMovimiento, round2, type Movimiento, type PeriodoConciliacion } from './engine';

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function crearPeriodoDemo(cuentaId = 'demo-banamex-123'): PeriodoConciliacion {
  const rnd = prng(20260630);
  const dia = (d: number) => `2026-06-${String(Math.min(30, Math.max(1, d))).padStart(2, '0')}`;
  const importe = (min: number, max: number) => round2(min + rnd() * (max - min));

  const tipos: Array<{ concepto: string; deposito: boolean }> = [
    { concepto: 'Cobro de factura', deposito: true },
    { concepto: 'Venta de contado', deposito: true },
    { concepto: 'Transferencia recibida', deposito: true },
    { concepto: 'Pago a proveedor', deposito: false },
    { concepto: 'Pago de servicios', deposito: false },
    { concepto: 'Pago de nomina', deposito: false },
    { concepto: 'Compra de material', deposito: false },
    { concepto: 'Anticipo a empleado', deposito: false },
    { concepto: 'Pago de impuestos', deposito: false }
  ];

  const libros: Movimiento[] = [];
  const banco: Movimiento[] = [];
  let ref = 10020;

  // 34 movimientos que aparecen en ambos lados (con desfase de fecha de 0 a 3 días)
  for (let i = 0; i < 34; i++) {
    const t = tipos[Math.floor(rnd() * tipos.length)];
    const monto = t.deposito ? importe(3000, 55000) : importe(1500, 48000);
    const d = 1 + Math.floor(rnd() * 26);
    const r = `REF-${ref++}`;
    const data = { concepto: `${t.concepto} ${r}`, referencia: r, deposito: t.deposito ? monto : 0, retiro: t.deposito ? 0 : monto };
    libros.push(nuevoMovimiento('libros', { ...data, fecha: dia(d) }, 1));
    banco.push(nuevoMovimiento('banco', { ...data, fecha: dia(d + Math.floor(rnd() * 4)) }, 1));
  }

  // Partidas sólo en el banco (no registradas en libros)
  banco.push(
    nuevoMovimiento('banco', { fecha: dia(11), concepto: 'Intereses ganados', referencia: 'INT-0626', deposito: 775.22 }, 1),
    nuevoMovimiento('banco', { fecha: dia(16), concepto: 'Comision por manejo de cuenta', referencia: 'COM-0616', retiro: 348.0 }, 1),
    nuevoMovimiento('banco', { fecha: dia(23), concepto: 'Comision por transferencia SPEI', referencia: 'COM-0623', retiro: 69.6 }, 1),
    nuevoMovimiento('banco', { fecha: dia(29), concepto: 'Abono por transferencia no identificado', referencia: 'SPEI-88213', deposito: 12500 }, 1)
  );

  // Partidas sólo en libros (en tránsito al corte)
  libros.push(
    nuevoMovimiento('libros', { fecha: dia(29), concepto: `Deposito en camino REF-${ref}`, referencia: `REF-${ref++}`, deposito: 28947.96 }, 1),
    nuevoMovimiento('libros', { fecha: dia(30), concepto: `Cobro de factura REF-${ref}`, referencia: `REF-${ref++}`, deposito: 15339.9 }, 1),
    nuevoMovimiento('libros', { fecha: dia(28), concepto: `Cheque 1045 pago a proveedor REF-${ref}`, referencia: `REF-${ref++}`, retiro: 23373.84 }, 1),
    nuevoMovimiento('libros', { fecha: dia(30), concepto: `Pago de nomina quincena REF-${ref}`, referencia: `REF-${ref++}`, retiro: 43219.32 }, 1)
  );

  return crearPeriodo({
    cuentaId,
    empresa: 'La Comercial S.A. de C.V.',
    banco: 'Banamex',
    cuenta: '123',
    fechaCorte: '2026-06-30',
    saldoInicialLibros: 247267.68,
    saldoInicialBanco: 247267.68,
    movimientos: [...libros, ...banco]
  });
}
