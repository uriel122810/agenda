'use client';

/**
 * Vistas previas del formato oficial (Conciliación Bancaria y Auxiliares del mes)
 * y modal para capturar los datos del formato (encabezados, firmas, jerarquía).
 */

import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Settings2, X } from 'lucide-react';
import { round2, saldoFinal, type PeriodoConciliacion } from '@/lib/conciliacion/engine';
import {
  construirHojaConciliacion,
  anchosPx,
  alineacion,
  textoVisible,
  ALTO_FILA,
  type CeldaHoja
} from '@/lib/conciliacion/hojaOficial';
import {
  fechaDMYCorta,
  formatoDe,
  MESES_MAYUS,
  numeroMX,
  type FormatoOficial
} from '@/lib/conciliacion/formatoOficial';
import { jerarquiaAuxiliar, ordenarAuxiliar, renglonesConcepto, textoRenglon } from '@/lib/conciliacion/pdfOficial';

const btnSecundario =
  'inline-flex items-center gap-1.5 rounded-xl border border-[#E8E2D9] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#581c2f]/40 hover:text-[#581c2f] disabled:opacity-40 transition-colors';
const btnPrimario =
  'inline-flex items-center gap-1.5 rounded-xl bg-[#581c2f] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#72223c] disabled:opacity-40 transition-colors';
const inputCls =
  'w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]';

// ── Vista previa: Conciliación Bancaria (misma hoja que el Excel) ───────────

const FUENTE_CSS: Record<string, string> = {
  Arial: 'Arial, "Liberation Sans", Helvetica, sans-serif',
  Calibri: 'Calibri, Carlito, "Segoe UI", sans-serif'
};

export function VistaConciliacionOficial({
  periodo,
  onExcel,
  onPdf,
  onFormato
}: {
  periodo: PeriodoConciliacion;
  onExcel: () => void;
  onPdf: () => void;
  onFormato?: () => void;
}) {
  const hoja = useMemo(() => construirHojaConciliacion(periodo), [periodo]);
  const cols = anchosPx(hoja);
  const colX: number[] = [];
  cols.reduce((x, w, i) => ((colX[i] = x), x + w), 0);
  const anchoTotal = cols.reduce((a, b) => a + b, 0);
  const tops: number[] = [];
  let alto = 0;
  hoja.filas.forEach((f, i) => {
    tops[i] = alto;
    alto += ((f.alto ?? ALTO_FILA) * 4) / 3;
  });

  const bordeCss = (b?: string) => (b === 'medium' ? '2px solid #000' : b === 'thin' ? '1px solid #000' : undefined);

  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-end gap-2 p-3 border-b border-[#E8E2D9]">
        <span className="mr-auto text-xs text-slate-500">Vista previa del formato oficial (igual al Excel y al PDF)</span>
        {onFormato && (
          <button onClick={onFormato} className={btnSecundario}>
            <Settings2 size={14} /> Datos del formato
          </button>
        )}
        <button onClick={onExcel} className={btnSecundario}>
          <FileSpreadsheet size={14} /> Descargar Excel
        </button>
        <button onClick={onPdf} className={btnPrimario}>
          <FileText size={14} /> Descargar PDF
        </button>
      </div>
      <div className="overflow-x-auto p-6">
        <div className="relative mx-auto bg-white" style={{ width: anchoTotal, height: alto, color: '#000' }}>
          {hoja.imagenes.map(img => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.archivo}
              src={`/conciliacion/${img.archivo}`}
              alt=""
              style={{ position: 'absolute', left: colX[img.col] + img.offX, top: tops[img.fila] + img.offY, width: img.ancho, height: img.alto }}
            />
          ))}
          {hoja.filas.map((fila, i) => {
            const ocupadas = new Set(
              fila.celdas.filter(c => c.fecha || typeof c.numero === 'number' || (c.texto ?? '') !== '').map(c => c.col)
            );
            const h = ((fila.alto ?? ALTO_FILA) * 4) / 3;
            return fila.celdas.map((c: CeldaHoja) => {
              const span = c.span ?? 1;
              const w = cols.slice(c.col, c.col + span).reduce((a, b) => a + b, 0);
              const al = alineacion(c);
              let anchoTexto = w;
              if (al === 'left') {
                let fin = c.col + span;
                while (fin < cols.length && !ocupadas.has(fin)) fin++;
                anchoTexto = colX[fin - 1] + cols[fin - 1] - colX[c.col];
              }
              const texto = textoVisible(c);
              return (
                <React.Fragment key={`${i}-${c.col}`}>
                  {c.bordes && (
                    <div
                      style={{
                        position: 'absolute',
                        left: colX[c.col],
                        top: tops[i],
                        width: w,
                        height: h,
                        borderTop: bordeCss(c.bordes.t),
                        borderBottom: bordeCss(c.bordes.b),
                        borderLeft: bordeCss(c.bordes.l),
                        borderRight: bordeCss(c.bordes.r),
                        boxSizing: 'border-box'
                      }}
                    />
                  )}
                  {texto.trim() && (
                    <div
                      style={{
                        position: 'absolute',
                        left: al === 'center' ? colX[c.col] - 200 : colX[c.col],
                        top: tops[i],
                        width: al === 'center' ? w + 400 : anchoTexto,
                        height: h,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: al === 'left' ? 'flex-start' : al === 'right' ? 'flex-end' : 'center',
                        padding: '0 2px 1px',
                        overflow: 'hidden',
                        whiteSpace: 'pre',
                        fontFamily: FUENTE_CSS[c.fuente],
                        fontSize: `${c.tam}pt`,
                        fontWeight: c.negrita ? 700 : 400,
                        lineHeight: 1.15
                      }}
                    >
                      {texto}
                    </div>
                  )}
                </React.Fragment>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

// ── Vista previa: Auxiliares del mes ────────────────────────────────────────

export function VistaAuxiliar({ periodo, onPdf }: { periodo: PeriodoConciliacion; onPdf: () => void }) {
  const f = formatoDe(periodo);
  const movs = ordenarAuxiliar(periodo.movimientos.filter(m => m.origen === 'libros' && !m.arrastrado));
  const debe = round2(movs.reduce((a, m) => a + m.deposito, 0));
  const haber = round2(movs.reduce((a, m) => a + m.retiro, 0));
  const si = round2(periodo.saldoInicialLibros);
  const sf = saldoFinal(periodo, 'libros');
  const [y, m] = periodo.fechaCorte.split('-').map(Number);
  const dia = Number(periodo.fechaCorte.slice(8, 10));
  const cifra = (n: number) => (n ? numeroMX(n) : '');
  const saldoCols = (n: number) => (n >= 0 ? [cifra(n), ''] : ['', cifra(-n)]);

  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs">
      <div className="flex items-center justify-end gap-2 p-3 border-b border-[#E8E2D9]">
        <span className="mr-auto text-xs text-slate-500">
          Auxiliar de la cuenta con los movimientos de Libros del periodo ({movs.length} movimientos)
        </span>
        <button onClick={onPdf} className={btnPrimario}>
          <FileText size={14} /> Descargar PDF
        </button>
      </div>
      <div className="overflow-x-auto p-6">
        <div className="min-w-[980px] font-mono text-[10px] leading-tight text-black">
          <p className="text-center text-base font-bold mb-3">AUXILIARES DEL MES</p>
          <div className="flex justify-between border-t border-black pt-1 text-xs">
            <span>ENTIDAD: {f.entidad}</span>
            <span>
              DEL 1 AL {dia} DE {MESES_MAYUS[m - 1]} DE {y}
            </span>
          </div>
          <table className="w-full mt-1 border-collapse">
            <thead>
              <tr className="border border-black">
                <th className="text-left font-normal px-1 w-[170px]">CUENTA / MOV-POL-FECHA</th>
                <th className="text-left font-normal px-1">CONCEPTO</th>
                <th className="font-normal px-1 text-right">SI DEBE</th>
                <th className="font-normal px-1 text-right">SI HABER</th>
                <th className="font-normal px-1 text-right">DEBE</th>
                <th className="font-normal px-1 text-right">HABER</th>
                <th className="font-normal px-1 text-right">SF DEBE</th>
                <th className="font-normal px-1 text-right">SF HABER</th>
              </tr>
            </thead>
            <tbody>
              {jerarquiaAuxiliar(periodo).map(c => (
                <tr key={c.codigo} className="font-bold">
                  <td className="px-1 pt-2">{c.codigo}</td>
                  <td className="px-1 pt-2">{c.nombre}</td>
                  {[...saldoCols(si), cifra(debe), cifra(haber), ...saldoCols(sf)].map((v, i) => (
                    <td key={i} className="px-1 pt-2 text-right whitespace-nowrap">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
              {movs.map(mv => {
                const renglones = (mv.conceptoRenglones?.length ? mv.conceptoRenglones : renglonesConcepto(mv.concepto)).map(textoRenglon);
                return (
                  <tr key={mv.id} className="align-top">
                    <td className="px-1 whitespace-pre">
                      {(mv.mov ?? '').padStart(3, ' ')}  {(mv.poliza ?? '').padEnd(7, ' ')} {fechaDMYCorta(mv.fecha)}
                    </td>
                    <td className="px-1 whitespace-pre">{renglones.join('\n')}</td>
                    <td />
                    <td />
                    <td className="px-1 text-right whitespace-nowrap">{cifra(mv.deposito)}</td>
                    <td className="px-1 text-right whitespace-nowrap">{cifra(mv.retiro)}</td>
                    <td />
                    <td />
                  </tr>
                );
              })}
              {movs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 font-sans text-xs">
                    No hay movimientos de Libros en este periodo. Importa el auxiliar del sistema contable (PDF) o captura los movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Modal: datos del formato oficial ─────────────────────────────────────────

export function ModalFormato({
  periodo,
  onCerrar,
  onGuardar
}: {
  periodo: PeriodoConciliacion;
  onCerrar: () => void;
  onGuardar: (f: FormatoOficial, saldoBancoCorte: number | undefined) => void;
}) {
  const inicial = formatoDe(periodo);
  const [f, setF] = useState<FormatoOficial>({ ...inicial, firmas: inicial.firmas.map(x => ({ ...x })) as FormatoOficial['firmas'] });
  const [jerarquia, setJerarquia] = useState(inicial.jerarquia.map(c => `${c.codigo} | ${c.nombre}`).join('\n'));
  const [saldoBanco, setSaldoBanco] = useState(
    typeof periodo.saldoBancoCorte === 'number' ? periodo.saldoBancoCorte.toFixed(2) : ''
  );
  const set = <K extends keyof FormatoOficial>(k: K, v: FormatoOficial[K]) => setF(prev => ({ ...prev, [k]: v }));
  const setFirma = (i: number, campo: 'nombre' | 'cargo', v: string) =>
    setF(prev => {
      const firmas = prev.firmas.map((x, j) => (j === i ? { ...x, [campo]: v } : x)) as FormatoOficial['firmas'];
      return { ...prev, firmas };
    });

  const guardar = () => {
    const jer = jerarquia
      .split('\n')
      .map(l => l.split('|').map(x => x.trim()))
      .filter(([codigo]) => codigo)
      .map(([codigo, nombre]) => ({ codigo: codigo.replace(/\s+/g, ' '), nombre: nombre ?? '' }));
    const sb = saldoBanco.trim() ? parseFloat(saldoBanco.replace(/,/g, '')) : undefined;
    onGuardar({ ...f, jerarquia: jer }, sb !== undefined && isFinite(sb) ? round2(sb) : undefined);
  };

  const campo = (label: string, valor: string, onChange: (v: string) => void, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="block font-bold text-slate-700 mb-1">{label}</span>
      <input value={valor} onChange={e => onChange(e.target.value)} className={inputCls} {...extra} />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" onClick={onCerrar}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#581c2f]">
            <Settings2 className="h-5 w-5" />
            <h3 className="text-base font-bold text-slate-900">Datos del formato oficial</h3>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Estos datos se imprimen en la Conciliación (Excel y PDF) y en el Auxiliar. Se copian automáticamente a los siguientes periodos de esta cuenta.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {campo('Encabezado (municipio)', f.municipio, v => set('municipio', v))}
          {campo('Entidad (auxiliar)', f.entidad, v => set('entidad', v))}
          {campo('Nombre de la cuenta', f.nombreCuenta, v => set('nombreCuenta', v), { placeholder: 'MIFEL PARTICIPACIONES' })}
          {campo('Banco (abreviado)', f.bancoCorto, v => set('bancoCorto', v), { placeholder: 'MIFEL' })}
          {campo('Número de cuenta bancaria', f.numeroCuenta, v => set('numeroCuenta', v), { placeholder: '01600731234' })}
          {campo('Cuenta contable', f.cuentaContable, v => set('cuentaContable', v), { placeholder: '1112-15-0-0-01' })}
          {campo('Consecutivo del archivo', f.consecutivo, v => set('consecutivo', v), { placeholder: '01' })}
          {campo('Fecha de elaboración', f.fechaElaboracion ?? periodo.fechaCorte, v => set('fechaElaboracion', v), { type: 'date' })}
          {campo('Saldo según estado de cuenta bancario (opcional)', saldoBanco, setSaldoBanco, {
            inputMode: 'decimal',
            placeholder: 'Vacío = se calcula con los movimientos del banco'
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {f.firmas.map((fi, i) => (
            <div key={i} className="rounded-xl border border-[#E8E2D9] p-3 space-y-2">
              {campo(`Firma ${i + 1}: nombre`, fi.nombre, v => setFirma(i, 'nombre', v))}
              {campo('Cargo', fi.cargo, v => setFirma(i, 'cargo', v))}
            </div>
          ))}
        </div>
        <label className="block text-xs">
          <span className="block font-bold text-slate-700 mb-1">Jerarquía de cuentas del auxiliar (una por renglón: código | nombre)</span>
          <textarea
            value={jerarquia}
            onChange={e => setJerarquia(e.target.value)}
            rows={6}
            className={`${inputCls} font-mono text-[11px]`}
            placeholder={'1000 | ACTIVO\n1100 | ACTIVO CIRCULANTE\n1110 | Efectivo y Equivalentes\n1112 0000 | Bancos/Tesorería\n1112 0015 | BANCA MIFEL 2025 - 2027\n1112 0015 0000 0000 0001 | PARTICIPACIONES MIFEL CTA.1234'}
          />
          <span className="text-slate-400">Se llena sola al importar el auxiliar en PDF. Si falta la cuenta de detalle se usa la cuenta contable.</span>
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCerrar} className={btnSecundario}>
            Cancelar
          </button>
          <button onClick={guardar} className={btnPrimario}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
