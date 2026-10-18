/**
 * Datos y utilidades del formato oficial de Conciliación Bancaria
 * (H. Ayuntamiento) y del reporte "Auxiliares del mes".
 */

import type { PeriodoConciliacion } from './engine';

export interface FirmaOficial {
  nombre: string;
  cargo: string;
}

export interface CuentaJerarquia {
  codigo: string;
  nombre: string;
}

export interface FormatoOficial {
  /** Título superior centrado, ej. "MUNICIPIO  DE LA PAZ" */
  municipio: string;
  /** Entidad del auxiliar, ej. "LA PAZ, 0086" */
  entidad: string;
  /** Nombre de la cuenta en el encabezado, ej. "MIFEL PARTICIPACIONES" */
  nombreCuenta: string;
  /** Banco abreviado, ej. "MIFEL" */
  bancoCorto: string;
  /** Número de cuenta bancaria, ej. "01600731234" */
  numeroCuenta: string;
  /** Cuenta contable, ej. "1112-15-0-0-01" */
  cuentaContable: string;
  /** Consecutivo con el que inicia el nombre de archivo, ej. "01" */
  consecutivo: string;
  /** Jerarquía de cuentas del auxiliar (de la mayor a la cuenta de detalle, que va al final) */
  jerarquia: CuentaJerarquia[];
  /** Elaboró, Revisó, Tesorero(a) */
  firmas: [FirmaOficial, FirmaOficial, FirmaOficial];
  /** Fecha de elaboración YYYY-MM-DD (si falta se usa la fecha de corte) */
  fechaElaboracion?: string;
}

export const MESES_MAYUS = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatoPorDefecto(p: Pick<PeriodoConciliacion, 'banco' | 'cuenta' | 'empresa'>): FormatoOficial {
  const banco = p.banco.toUpperCase();
  return {
    municipio: 'MUNICIPIO  DE LA PAZ',
    entidad: 'LA PAZ, 0086',
    nombreCuenta: `${banco}`,
    bancoCorto: banco.split(/\s+/)[0] ?? banco,
    numeroCuenta: p.cuenta.replace(/[^0-9]/g, ''),
    cuentaContable: '',
    consecutivo: '01',
    jerarquia: [
      { codigo: '1000', nombre: 'ACTIVO' },
      { codigo: '1100', nombre: 'ACTIVO CIRCULANTE' },
      { codigo: '1110', nombre: 'Efectivo y Equivalentes' },
      { codigo: '1112 0000', nombre: 'Bancos/Tesorería' }
    ],
    firmas: [
      { nombre: '', cargo: 'ELABORÓ' },
      { nombre: '', cargo: 'REVISÓ' },
      { nombre: '', cargo: 'TESORERA MUNICIPAL' }
    ]
  };
}

export function formatoDe(p: PeriodoConciliacion): FormatoOficial {
  return p.formato ?? formatoPorDefecto(p);
}

/** Primer día del mes de la fecha de corte */
export function inicioPeriodo(fechaCorte: string): string {
  return `${fechaCorte.slice(0, 8)}01`;
}

/** "DEL 1° AL 31 DE AGOSTO DE 2026" */
export function textoPeriodoConc(fechaCorte: string): string {
  const [y, m, d] = fechaCorte.split('-').map(Number);
  return `DEL 1° AL ${d} DE ${MESES_MAYUS[m - 1]} DE ${y}`;
}

/** "31 DE AGOSTO DE 2026" */
export function textoFechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${d} DE ${MESES_MAYUS[m - 1]} DE ${y}`;
}

/** dd/mm/aaaa */
export function fechaDMY(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

/** dd/mm/aa (auxiliar) */
export function fechaDMYCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

/** Formato de celda d-mmm-yy de Excel en español: 31-ago-26 */
export function fechaExcelCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${d}-${MESES_CORTOS[m - 1]}-${String(y).slice(2)}`;
}

/** Formato de celda mm-dd-yy de Excel: 08-31-26 */
export function fechaExcelMDY(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return `${m}-${d}-${y.slice(2)}`;
}

/** 1,234,567.89 */
export function numeroMX(n: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toFixed(2);
  const [ent, dec] = s.split('.');
  return `${neg ? '-' : ''}${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

/**
 * Nombre de archivo con la convención del despacho:
 *   01_26_08_CONC_MIFEL_1234_PARTICIPACIONES
 *   {consecutivo}_{aa}_{mm}_{CONC|AUX}_{BANCO}_{últimos 4 de la cuenta}_{nombre}
 */
export function nombreArchivoOficial(p: PeriodoConciliacion, tipo: 'CONC' | 'AUX'): string {
  const f = formatoDe(p);
  const [y, m] = p.fechaCorte.split('-');
  const banco = (f.bancoCorto || p.banco).toUpperCase().replace(/\s+/g, '_');
  const cuenta = (f.numeroCuenta || p.cuenta).replace(/[^0-9]/g, '').slice(-4);
  const resto = f.nombreCuenta
    .toUpperCase()
    .split(/\s+/)
    .filter(w => w && w !== (f.bancoCorto || '').toUpperCase())
    .join('_');
  const limpiar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9_]/gi, '');
  return [f.consecutivo || '01', y.slice(2), m, tipo, limpiar(banco), cuenta, limpiar(resto)].filter(Boolean).join('_');
}
