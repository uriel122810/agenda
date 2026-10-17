'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, Link2, Lock,
  Plus, RefreshCw, Search, Settings2, Sparkles, Trash2, Unlink, Upload, Wand2, X
} from 'lucide-react';
import {
  agregarMovimientos, conciliarAutomatico, conciliarManual, construirReporte, crearPeriodo,
  desconciliar, desconciliarTodo, eliminarMovimiento, formatFecha, formatMoneda, neto,
  nombrePeriodo, nuevoMovimiento, parseMovimientosCsv, procesarConciliacion, round2,
  saldoFinal, totalesLado, type CriteriosConciliacion, type Movimiento, type Origen,
  type PeriodoConciliacion, type ReporteConciliacion
} from '@/lib/conciliacion/engine';
import { deleteConciliacion, fetchConciliaciones, saveConciliaciones } from '@/lib/conciliacion/store';
import { generarPdfReporteDetallado, generarPdfReporteGeneral } from '@/lib/conciliacion/pdf';
import { crearPeriodoDemo } from '@/lib/conciliacion/demo';
import { downloadPdfBlob } from '@/lib/pdfReportGenerator';
import { fetchBancos, type CuentaBancariaRecord } from '@/lib/crudService';
import { logAuditOperation } from '@/lib/auditService';

type Filtro = 'todos' | 'conciliados' | 'pendientes';
type Vista = 'seguimiento' | 'general' | 'detallado';

const inputCls =
  'w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]';
const btnPrimario =
  'inline-flex items-center gap-1.5 rounded-xl bg-[#581c2f] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#72223c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
const btnSecundario =
  'inline-flex items-center gap-1.5 rounded-xl border border-[#E8E2D9] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[#581c2f]/40 hover:text-[#581c2f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

const nombreCuenta = (b: CuentaBancariaRecord) => `${b.banco} ${b.numero_cuenta.split('(')[0].trim()}`;

export default function ConciliacionBancaria({ searchQuery = '' }: { searchQuery?: string }) {
  const [periodos, setPeriodos] = useState<PeriodoConciliacion[]>([]);
  const [bancos, setBancos] = useState<CuentaBancariaRecord[]>([]);
  const [cuentaId, setCuentaId] = useState<string>('');
  const [periodoId, setPeriodoId] = useState<string>('');
  const [vista, setVista] = useState<Vista>('seguimiento');
  const [cargando, setCargando] = useState(true);

  const [filtro, setFiltro] = useState<Record<Origen, Filtro>>({ libros: 'todos', banco: 'todos' });
  const [busqueda, setBusqueda] = useState<Record<Origen, string>>({ libros: '', banco: '' });
  const [sel, setSel] = useState<Record<Origen, Set<string>>>({ libros: new Set(), banco: new Set() });
  const [grupoResaltado, setGrupoResaltado] = useState<string | null>(null);

  const [modal, setModal] = useState<null | 'nueva' | 'criterios' | 'procesar' | { tipo: 'importar' | 'agregar'; origen: Origen }>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const notificar = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [ps, bs] = await Promise.all([fetchConciliaciones(), fetchBancos()]);
      setPeriodos(ps);
      setBancos(bs);
      const abierto = [...ps].reverse().find(p => p.estado === 'abierto') ?? ps[ps.length - 1];
      if (abierto) {
        setCuentaId(abierto.cuentaId);
        setPeriodoId(abierto.id);
      }
      setCargando(false);
    })();
  }, []);

  const cuentas = useMemo(() => {
    const map = new Map<string, string>();
    periodos.forEach(p => map.set(p.cuentaId, `${p.banco} ${p.cuenta}`));
    return [...map.entries()];
  }, [periodos]);

  const periodosCuenta = useMemo(
    () => periodos.filter(p => p.cuentaId === cuentaId).sort((a, b) => b.numero - a.numero),
    [periodos, cuentaId]
  );
  const periodo = periodos.find(p => p.id === periodoId) ?? null;
  const cerrado = periodo?.estado === 'cerrado';
  const reporte = useMemo(() => (periodo ? construirReporte(periodo) : null), [periodo]);

  const limpiarSeleccion = () => setSel({ libros: new Set(), banco: new Set() });

  /** Aplica un cambio al periodo activo y lo persiste */
  const aplicar = (fn: (p: PeriodoConciliacion) => PeriodoConciliacion, okMsg?: string) => {
    if (!periodo) return;
    try {
      const nuevo = fn(periodo);
      setPeriodos(prev => prev.map(p => (p.id === nuevo.id ? nuevo : p)));
      void saveConciliaciones([nuevo]);
      if (okMsg) notificar(okMsg);
      return nuevo;
    } catch (err) {
      notificar((err as Error).message, true);
    }
  };

  const seleccionarCuenta = (id: string) => {
    setCuentaId(id);
    const ps = periodos.filter(p => p.cuentaId === id).sort((a, b) => b.numero - a.numero);
    setPeriodoId((ps.find(p => p.estado === 'abierto') ?? ps[0])?.id ?? '');
    limpiarSeleccion();
  };

  // ── Acciones ───────────────────────────────────────────────────────────────
  const onAutomatica = () => {
    if (!periodo) return;
    try {
      const { periodo: nuevo, nuevos } = conciliarAutomatico(periodo);
      aplicar(() => nuevo, nuevos ? `Conciliación automática: ${nuevos} partidas conciliadas.` : 'No se encontraron coincidencias con los criterios actuales.');
      limpiarSeleccion();
    } catch (err) {
      notificar((err as Error).message, true);
    }
  };

  const onConciliarSeleccion = () => {
    const r = aplicar(p => conciliarManual(p, [...sel.libros], [...sel.banco]), 'Movimientos conciliados manualmente.');
    if (r) limpiarSeleccion();
  };

  const onDesconciliarTodo = () => {
    if (!confirm('¿Quitar TODAS las conciliaciones de este periodo?')) return;
    aplicar(desconciliarTodo, 'Se des-conciliaron todos los movimientos.');
    limpiarSeleccion();
  };

  const onProcesar = () => {
    if (!periodo) return;
    try {
      const { cerrado: c, siguiente } = procesarConciliacion(periodo);
      setPeriodos(prev => [...prev.map(p => (p.id === c.id ? c : p)), siguiente]);
      void saveConciliaciones([c, siguiente]);
      void logAuditOperation({
        modulo: 'Bancos',
        accion: `Se procesó la conciliación No. ${c.numero} de ${c.banco} ${c.cuenta}`,
        detalles: `${c.cierre!.conciliados} conciliados • ${c.cierre!.pendientesArrastrados} pendientes arrastrados a la No. ${siguiente.numero}`
      });
      setPeriodoId(siguiente.id);
      setModal(null);
      limpiarSeleccion();
      notificar(`Conciliación No. ${c.numero} cerrada. Se abrió la No. ${siguiente.numero} con ${siguiente.movimientos.length} pendientes.`);
    } catch (err) {
      notificar((err as Error).message, true);
    }
  };

  const onPdf = async (tipo: 'general' | 'detallado') => {
    if (!reporte) return;
    const bytes = tipo === 'general' ? await generarPdfReporteGeneral(reporte) : await generarPdfReporteDetallado(reporte);
    downloadPdfBlob(bytes, `Conciliacion_${tipo === 'general' ? 'General' : 'Detallado'}_${reporte.banco}_${reporte.cuenta}_No${reporte.numero}`.replace(/\s+/g, '_'));
  };

  const onCrear = (nuevo: PeriodoConciliacion) => {
    setPeriodos(prev => [...prev, nuevo]);
    void saveConciliaciones([nuevo]);
    setCuentaId(nuevo.cuentaId);
    setPeriodoId(nuevo.id);
    setModal(null);
    limpiarSeleccion();
    void logAuditOperation({ modulo: 'Bancos', accion: `Nueva conciliación ${nuevo.banco} ${nuevo.cuenta}`, detalles: `Corte al ${formatFecha(nuevo.fechaCorte)}` });
    notificar(`Conciliación No. ${nuevo.numero} creada.`);
  };

  const onCargarDemo = () => {
    const existente = periodos.find(p => p.cuentaId === 'demo-banamex-123');
    if (existente) {
      seleccionarCuenta('demo-banamex-123');
      return;
    }
    onCrear(crearPeriodoDemo());
  };

  const onEliminarPeriodo = async () => {
    if (!periodo || cerrado) return;
    if (!confirm(`¿Eliminar la conciliación No. ${periodo.numero} (${nombrePeriodo(periodo.fechaCorte)}) y todos sus movimientos?`)) return;
    await deleteConciliacion(periodo.id);
    const resto = periodos.filter(p => p.id !== periodo.id);
    setPeriodos(resto);
    const sig = resto.filter(p => p.cuentaId === periodo.cuentaId).sort((a, b) => b.numero - a.numero)[0];
    setPeriodoId(sig?.id ?? '');
    if (!sig) setCuentaId(resto[0]?.cuentaId ?? '');
  };

  const toggleSel = (origen: Origen, id: string) => {
    setSel(prev => {
      const s = new Set(prev[origen]);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...prev, [origen]: s };
    });
  };

  // ── Sumas de selección ─────────────────────────────────────────────────────
  const sumaSel = (origen: Origen) =>
    round2(periodo?.movimientos.filter(m => sel[origen].has(m.id)).reduce((a, m) => a + neto(m), 0) ?? 0);
  const selL = sumaSel('libros');
  const selB = sumaSel('banco');
  const difSel = round2(selL - selB);
  const haySeleccion = sel.libros.size > 0 && sel.banco.size > 0;
  const tolerancia = periodo?.criterios.toleranciaImporte ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (cargando) {
    return <div className="py-24 text-center text-sm text-slate-400">Cargando conciliaciones…</div>;
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-[#E8E2D9] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Conciliación Bancaria
            {periodo && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                  cerrado ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {cerrado ? 'Cerrada' : 'Abierta'}
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Concilia Libros contra el Estado de Cuenta, cierra el periodo arrastrando pendientes y genera los reportes General y Detallado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cuentas.length > 0 && (
            <select value={cuentaId} onChange={e => seleccionarCuenta(e.target.value)} className={`${inputCls} !w-auto !py-2 text-xs font-semibold`}>
              {cuentas.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          )}
          {periodosCuenta.length > 0 && (
            <select value={periodoId} onChange={e => { setPeriodoId(e.target.value); limpiarSeleccion(); }} className={`${inputCls} !w-auto !py-2 text-xs`}>
              {periodosCuenta.map(p => (
                <option key={p.id} value={p.id}>
                  No. {p.numero} · {nombrePeriodo(p.fechaCorte)} {p.estado === 'cerrado' ? '(cerrada)' : ''}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => setModal('nueva')} className={btnPrimario}>
            <Plus size={14} /> Nueva conciliación
          </button>
        </div>
      </div>

      {!periodo ? (
        <div className="rounded-2xl border border-dashed border-[#E8E2D9] bg-white p-10 text-center space-y-4">
          <FileSpreadsheet className="mx-auto h-10 w-10 text-[#b39656]" />
          <div>
            <p className="font-bold text-slate-800">Aún no hay conciliaciones</p>
            <p className="text-xs text-slate-500 mt-1">Crea una conciliación para una cuenta bancaria e importa los movimientos de Libros y del Estado de cuenta.</p>
          </div>
          <div className="flex justify-center gap-2">
            <button onClick={() => setModal('nueva')} className={btnPrimario}><Plus size={14} /> Nueva conciliación</button>
            <button onClick={onCargarDemo} className={btnSecundario}><Sparkles size={14} /> Cargar datos de ejemplo</button>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de acciones tipo cinta */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-3 flex flex-wrap items-center gap-2 shadow-xs">
            <Grupo titulo="Datos">
              <button disabled={cerrado} onClick={() => setModal({ tipo: 'importar', origen: 'libros' })} className={btnSecundario}><Upload size={14} /> Importar Libros</button>
              <button disabled={cerrado} onClick={() => setModal({ tipo: 'importar', origen: 'banco' })} className={btnSecundario}><Upload size={14} /> Importar Banco</button>
            </Grupo>
            <Grupo titulo="Acciones">
              <button disabled={cerrado} onClick={onAutomatica} className={btnSecundario}><Wand2 size={14} /> Conciliación automática</button>
              <button disabled={cerrado} onClick={() => setModal('criterios')} className={btnSecundario}><Settings2 size={14} /> Criterios</button>
              <button disabled={cerrado} onClick={onDesconciliarTodo} className={btnSecundario}><Unlink size={14} /> Des-conciliar todo</button>
            </Grupo>
            <Grupo titulo="Proceso">
              <button disabled={cerrado} onClick={() => setModal('procesar')} className={btnPrimario}><Lock size={14} /> Procesar conciliación</button>
            </Grupo>
            <Grupo titulo="Reportes">
              <button onClick={() => onPdf('general')} className={btnSecundario}><Download size={14} /> PDF General</button>
              <button onClick={() => onPdf('detallado')} className={btnSecundario}><Download size={14} /> PDF Detallado</button>
            </Grupo>
            {!cerrado && (
              <button onClick={onEliminarPeriodo} title="Eliminar conciliación" className="ml-auto p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi etiqueta="Saldo según libros" valor={saldoFinal(periodo, 'libros')} />
            <Kpi etiqueta="Saldo según banco" valor={saldoFinal(periodo, 'banco')} />
            <Kpi etiqueta="Saldo conciliado" valor={reporte!.saldoConciliado} />
            <Kpi
              etiqueta={Math.abs(reporte!.diferencia) < 0.005 ? 'Diferencia · cuadrada' : 'Diferencia por aclarar'}
              valor={reporte!.diferencia}
              tono={Math.abs(reporte!.diferencia) < 0.005 ? 'ok' : 'error'}
            />
          </div>

          {/* Pestañas */}
          <div className="flex gap-1 border-b border-[#E8E2D9]">
            {([
              ['seguimiento', 'Seguimiento'],
              ['general', 'Reporte General'],
              ['detallado', 'Reporte Detallado']
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setVista(id)}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${
                  vista === id ? 'border-[#581c2f] text-[#581c2f]' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {vista === 'seguimiento' && (
            <>
              {cerrado && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                  <Lock size={14} /> Conciliación cerrada el {new Date(periodo.cierre!.fechaCierre).toLocaleDateString('es-MX')}. Sólo lectura.
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {(['libros', 'banco'] as const).map(origen => (
                  <PanelMovimientos
                    key={origen}
                    origen={origen}
                    periodo={periodo}
                    filtro={filtro[origen]}
                    onFiltro={f => setFiltro(prev => ({ ...prev, [origen]: f }))}
                    busqueda={busqueda[origen] || searchQuery}
                    onBusqueda={q => setBusqueda(prev => ({ ...prev, [origen]: q }))}
                    seleccion={sel[origen]}
                    onToggle={id => toggleSel(origen, id)}
                    grupoResaltado={grupoResaltado}
                    onResaltar={setGrupoResaltado}
                    soloLectura={cerrado}
                    onAgregar={() => setModal({ tipo: 'agregar', origen })}
                    onDesconciliar={id => aplicar(p => desconciliar(p, id), 'Conciliación deshecha.')}
                    onEliminar={id => aplicar(p => eliminarMovimiento(p, id))}
                  />
                ))}
              </div>

              {/* Barra de conciliación manual */}
              {!cerrado && (sel.libros.size > 0 || sel.banco.size > 0) && (
                <div className="sticky bottom-4 z-20 rounded-2xl border border-[#581c2f]/20 bg-white/95 backdrop-blur px-4 py-3 shadow-xl flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  <span><b>Libros</b> ({sel.libros.size}): <span className="font-mono">{formatMoneda(selL)}</span></span>
                  <span><b>Banco</b> ({sel.banco.size}): <span className="font-mono">{formatMoneda(selB)}</span></span>
                  <span className={Math.abs(difSel) <= tolerancia + 0.001 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                    Diferencia: <span className="font-mono">{formatMoneda(difSel)}</span>
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button onClick={limpiarSeleccion} className={btnSecundario}>Limpiar</button>
                    <button
                      onClick={onConciliarSeleccion}
                      disabled={!haySeleccion || Math.abs(difSel) > tolerancia + 0.001}
                      className={btnPrimario}
                    >
                      <Link2 size={14} /> Conciliar seleccionados
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {vista !== 'seguimiento' && reporte && <VistaReporte reporte={reporte} detallado={vista === 'detallado'} onPdf={() => onPdf(vista)} />}
        </>
      )}

      {/* Modales */}
      {modal === 'nueva' && (
        <ModalNueva
          bancos={bancos}
          periodos={periodos}
          onCerrar={() => setModal(null)}
          onCrear={onCrear}
          onDemo={() => { setModal(null); onCargarDemo(); }}
        />
      )}
      {modal === 'criterios' && periodo && (
        <ModalCriterios
          criterios={periodo.criterios}
          onCerrar={() => setModal(null)}
          onGuardar={c => { aplicar(p => ({ ...p, criterios: c }), 'Criterios actualizados.'); setModal(null); }}
        />
      )}
      {modal === 'procesar' && periodo && (
        <ModalProcesar periodo={periodo} reporte={reporte!} onCerrar={() => setModal(null)} onConfirmar={onProcesar} />
      )}
      {modal && typeof modal === 'object' && modal.tipo === 'importar' && periodo && (
        <ModalImportar
          origen={modal.origen}
          onCerrar={() => setModal(null)}
          onImportar={texto => {
            const { movimientos, errores } = parseMovimientosCsv(texto, modal.origen, periodo.numero);
            if (movimientos.length === 0) {
              notificar(errores[0] ?? 'No se encontraron movimientos.', true);
              return;
            }
            aplicar(
              p => agregarMovimientos(p, movimientos),
              `${movimientos.length} movimientos importados a ${modal.origen === 'libros' ? 'Libros' : 'Banco'}${errores.length ? ` (${errores.length} filas omitidas)` : ''}.`
            );
            setModal(null);
          }}
        />
      )}
      {modal && typeof modal === 'object' && modal.tipo === 'agregar' && periodo && (
        <ModalAgregar
          origen={modal.origen}
          fechaDefault={periodo.fechaCorte}
          onCerrar={() => setModal(null)}
          onAgregar={data => {
            aplicar(p => agregarMovimientos(p, [nuevoMovimiento(modal.origen, data, p.numero)]), 'Movimiento agregado.');
            setModal(null);
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex max-w-md items-center gap-3 rounded-2xl px-5 py-3.5 text-white shadow-2xl border ${
            toast.error ? 'bg-red-700 border-red-400/30' : 'bg-[#581c2f] border-[#b39656]/30'
          }`}
        >
          {toast.error ? <AlertTriangle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-[#b39656]" />}
          <span className="text-xs font-semibold">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 pr-3 mr-1 border-r border-[#E8E2D9] last:border-r-0">
      <div className="flex flex-wrap gap-1.5">{children}</div>
      <span className="text-[10px] text-center text-slate-400 font-medium">{titulo}</span>
    </div>
  );
}

function Kpi({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono?: 'ok' | 'error' }) {
  const color = tono === 'ok' ? 'text-emerald-700' : tono === 'error' ? 'text-red-600' : 'text-slate-900';
  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold text-slate-500">{etiqueta}</p>
      <p className={`mt-1 text-lg font-bold font-mono tabular-nums ${color}`}>${formatMoneda(valor)}</p>
    </div>
  );
}

function PanelMovimientos(props: {
  origen: Origen;
  periodo: PeriodoConciliacion;
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  busqueda: string;
  onBusqueda: (q: string) => void;
  seleccion: Set<string>;
  onToggle: (id: string) => void;
  grupoResaltado: string | null;
  onResaltar: (g: string | null) => void;
  soloLectura: boolean;
  onAgregar: () => void;
  onDesconciliar: (id: string) => void;
  onEliminar: (id: string) => void;
}) {
  const { origen, periodo, filtro, busqueda, seleccion, grupoResaltado, soloLectura } = props;
  const totales = totalesLado(periodo, origen);
  const q = busqueda.trim().toLowerCase();
  const filas = periodo.movimientos
    .filter(m => m.origen === origen)
    .filter(m => (filtro === 'todos' ? true : filtro === 'conciliados' ? !!m.conciliacionId : !m.conciliacionId))
    .filter(m => !q || `${m.concepto} ${m.referencia} ${m.deposito} ${m.retiro} ${formatFecha(m.fecha)}`.toLowerCase().includes(q))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const titulo = origen === 'libros' ? 'Libros' : 'Banco (estado de cuenta)';
  const colDep = origen === 'libros' ? 'Cargo' : 'Abono';
  const colRet = origen === 'libros' ? 'Abono' : 'Cargo';

  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs flex flex-col min-w-0">
      <div className="px-4 py-3 border-b border-[#E8E2D9] flex flex-wrap items-center gap-2">
        <h3 className="font-bold text-[#581c2f] text-sm mr-auto">{titulo}</h3>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={busqueda}
            onChange={e => props.onBusqueda(e.target.value)}
            placeholder="Buscar"
            className="rounded-lg border border-slate-200 pl-7 pr-2 py-1.5 text-xs w-32 focus:outline-none focus:border-[#581c2f]"
          />
        </div>
        <select value={filtro} onChange={e => props.onFiltro(e.target.value as Filtro)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs bg-white">
          <option value="todos">Todos</option>
          <option value="conciliados">Solo conciliados</option>
          <option value="pendientes">Solo no conciliados</option>
        </select>
        {!soloLectura && (
          <button onClick={props.onAgregar} title="Agregar movimiento" className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#581c2f]">
            <Plus size={14} />
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-[460px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#FDFBF9] text-slate-500 text-[11px]">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="text-left px-2 py-2 font-semibold">Fecha</th>
              <th className="text-left px-2 py-2 font-semibold">Concepto</th>
              <th className="text-right px-2 py-2 font-semibold">{colDep}</th>
              <th className="text-right px-2 py-2 font-semibold">{colRet}</th>
              <th className="w-14 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Sin movimientos{filtro !== 'todos' ? ' con este filtro' : ''}.</td></tr>
            )}
            {filas.map(m => {
              const conciliado = !!m.conciliacionId;
              const resaltado = grupoResaltado && m.conciliacionId === grupoResaltado;
              const seleccionado = seleccion.has(m.id);
              return (
                <tr
                  key={m.id}
                  onClick={() => (conciliado ? props.onResaltar(resaltado ? null : m.conciliacionId) : !soloLectura && props.onToggle(m.id))}
                  className={`group border-t border-slate-100 cursor-pointer ${
                    resaltado ? 'bg-amber-50' : seleccionado ? 'bg-[#FBF0F3]' : conciliado ? 'bg-emerald-50/40 text-slate-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-2 py-1.5 text-center">
                    {conciliado ? (
                      <CheckCircle2 size={14} className="inline text-emerald-600" />
                    ) : (
                      <input type="checkbox" readOnly checked={seleccionado} disabled={soloLectura} className="accent-[#581c2f]" />
                    )}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap font-mono">{formatFecha(m.fecha)}</td>
                  <td className="px-2 py-1.5 max-w-[260px]">
                    <div className="truncate" title={m.concepto}>{m.concepto}</div>
                    {m.arrastrado && <span className="text-[10px] text-[#b39656] font-semibold">Periodo anterior (No. {m.periodoOrigen})</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{m.deposito ? formatMoneda(m.deposito) : ''}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{m.retiro ? formatMoneda(m.retiro) : ''}</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    {!soloLectura && conciliado && (
                      <button
                        onClick={e => { e.stopPropagation(); props.onDesconciliar(m.id); }}
                        title="Des-conciliar"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#581c2f]"
                      >
                        <Unlink size={13} />
                      </button>
                    )}
                    {!soloLectura && !m.arrastrado && (
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar este movimiento?')) props.onEliminar(m.id); }}
                        title="Eliminar"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-auto border-t border-[#E8E2D9] bg-[#FDFBF9] px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] rounded-b-2xl">
        <span className="text-slate-500">{totales.conciliados} conciliados de {totales.total}</span>
        <span className="text-right">Suma: <b className="font-mono">{formatMoneda(totales.suma)}</b></span>
        <span className="text-slate-500">{totales.noConciliados} no conciliados · {filas.length} mostrados</span>
        <span className="text-right">Conciliado: <b className="font-mono text-emerald-700">{formatMoneda(totales.sumaConciliada)}</b></span>
        <span></span>
        <span className="text-right">Pendiente: <b className="font-mono text-[#581c2f]">{formatMoneda(totales.sumaPendiente)}</b></span>
      </div>
    </div>
  );
}

function VistaReporte({ reporte, detallado, onPdf }: { reporte: ReporteConciliacion; detallado: boolean; onPdf: () => void }) {
  const cuadra = Math.abs(reporte.diferencia) < 0.005;
  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs">
      <div className="flex justify-end p-3 border-b border-[#E8E2D9]">
        <button onClick={onPdf} className={btnSecundario}><FileText size={14} /> Exportar a PDF</button>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm">
        <div className="text-center space-y-0.5 mb-6">
          <p className="font-bold text-[#581c2f] text-base">{reporte.empresa}</p>
          <p className="font-semibold">Conciliación al: {formatFecha(reporte.fechaCorte)}</p>
          <p className="font-semibold">{reporte.banco} {reporte.cuenta}</p>
          <p className="font-bold">{detallado ? 'Reporte Detallado de Conciliación' : 'Reporte General de Conciliación'}</p>
          <p className="text-xs text-slate-500">Conciliación No. {reporte.numero} - {reporte.periodo}</p>
        </div>

        <FilaReporte etiqueta="Saldo según estado de cuenta" valor={reporte.saldoBanco} fuerte />
        {reporte.secciones.map(s => (
          <div key={s.titulo} className="mt-3">
            <div className={`flex items-baseline gap-3 ${detallado ? 'bg-[#FDFBF9] rounded-lg px-2 py-1.5' : 'px-2 py-1'}`}>
              <span className="font-mono font-bold text-[#581c2f] w-8">({s.signo})</span>
              <span className={`flex-1 ${detallado ? 'font-semibold' : ''}`}>{s.titulo}</span>
              {!detallado && <span className="text-xs text-slate-400">{s.movimientos.length} mov.</span>}
              {!detallado && <span className="font-mono tabular-nums w-32 text-right">{formatMoneda(s.total)}</span>}
            </div>
            {detallado && (
              <div className="pl-12 pr-2">
                {s.movimientos.length === 0 && <p className="text-xs text-slate-400 py-1.5">Sin partidas pendientes.</p>}
                {s.movimientos.map(m => (
                  <div key={m.id} className="flex gap-3 py-1 text-xs border-b border-slate-50">
                    <span className="font-mono w-20 shrink-0">{formatFecha(m.fecha)}</span>
                    <span className="flex-1 truncate">
                      {m.concepto}
                      {m.arrastrado && <span className="ml-2 text-[10px] text-[#b39656] font-semibold">periodo ant.</span>}
                    </span>
                    <span className="font-mono tabular-nums w-28 text-right">{formatMoneda(m[s.campo])}</span>
                    <span className="w-28" />
                  </div>
                ))}
                <div className="flex gap-3 py-1.5 text-xs font-bold">
                  <span className="flex-1">Total</span>
                  <span className="font-mono tabular-nums w-28 text-right">{formatMoneda(s.total)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="mt-5 border-t border-slate-300 pt-3 space-y-1">
          <FilaReporte etiqueta="Saldo conciliado" valor={reporte.saldoConciliado} fuerte />
          <FilaReporte etiqueta="Saldo según libros" valor={reporte.saldoLibros} />
          <FilaReporte
            etiqueta={cuadra ? 'Diferencia (conciliación cuadrada)' : 'Diferencia por aclarar'}
            valor={reporte.diferencia}
            fuerte
            color={cuadra ? 'text-emerald-700' : 'text-red-600'}
          />
        </div>
      </div>
    </div>
  );
}

function FilaReporte({ etiqueta, valor, fuerte, color }: { etiqueta: string; valor: number; fuerte?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between px-2 py-1 ${fuerte ? 'font-bold' : ''} ${color ?? ''}`}>
      <span>{etiqueta}</span>
      <span className="font-mono tabular-nums">{formatMoneda(valor)}</span>
    </div>
  );
}

function Modal({ titulo, icono, onCerrar, children, ancho = 'max-w-lg' }: { titulo: string; icono?: React.ReactNode; onCerrar: () => void; children: React.ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" onClick={onCerrar}>
      <div className={`w-full ${ancho} rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#581c2f]">
            {icono}
            <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-bold text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

function ultimoDiaMesAnterior(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 0)).toISOString().slice(0, 10);
}

function ModalNueva({ bancos, periodos, onCerrar, onCrear, onDemo }: {
  bancos: CuentaBancariaRecord[];
  periodos: PeriodoConciliacion[];
  onCerrar: () => void;
  onCrear: (p: PeriodoConciliacion) => void;
  onDemo: () => void;
}) {
  const [cuentaId, setCuentaId] = useState(bancos[0]?.id ?? 'manual');
  const [empresa, setEmpresa] = useState(periodos[periodos.length - 1]?.empresa ?? '');
  const [bancoManual, setBancoManual] = useState('');
  const [cuentaManual, setCuentaManual] = useState('');
  const [fechaCorte, setFechaCorte] = useState(ultimoDiaMesAnterior());
  const [saldoLibros, setSaldoLibros] = useState('0.00');
  const [saldoBanco, setSaldoBanco] = useState('0.00');

  const abierta = periodos.find(p => p.cuentaId === cuentaId && p.estado === 'abierto');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = bancos.find(x => x.id === cuentaId);
    const banco = b ? b.banco : bancoManual.trim();
    const cuenta = b ? b.numero_cuenta.split('(')[0].trim() : cuentaManual.trim();
    if (!banco || !empresa.trim()) return;
    const id = b ? b.id : `manual-${banco}-${cuenta}`.toLowerCase().replace(/\s+/g, '-');
    onCrear(
      crearPeriodo({
        cuentaId: id,
        empresa: empresa.trim(),
        banco,
        cuenta,
        fechaCorte,
        saldoInicialLibros: parseFloat(saldoLibros.replace(/,/g, '')) || 0,
        saldoInicialBanco: parseFloat(saldoBanco.replace(/,/g, '')) || 0,
        numero: Math.max(0, ...periodos.filter(p => p.cuentaId === id).map(p => p.numero)) + 1
      })
    );
  };

  return (
    <Modal titulo="Nueva conciliación" icono={<Plus className="h-5 w-5" />} onCerrar={onCerrar}>
      <form onSubmit={submit} className="space-y-3.5 text-xs">
        <Campo label="Empresa *">
          <input required value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Razón social" className={inputCls} />
        </Campo>
        <Campo label="Cuenta bancaria *">
          <select value={cuentaId} onChange={e => setCuentaId(e.target.value)} className={inputCls}>
            {bancos.map(b => <option key={b.id} value={b.id}>{nombreCuenta(b)}</option>)}
            <option value="manual">Otra cuenta…</option>
          </select>
        </Campo>
        {cuentaId === 'manual' && (
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Banco *"><input required value={bancoManual} onChange={e => setBancoManual(e.target.value)} className={inputCls} /></Campo>
            <Campo label="No. de cuenta"><input value={cuentaManual} onChange={e => setCuentaManual(e.target.value)} className={inputCls} /></Campo>
          </div>
        )}
        {abierta && (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800">
            Esta cuenta ya tiene abierta la conciliación No. {abierta.numero}. Lo normal es procesarla para que se genere la siguiente con los pendientes.
          </p>
        )}
        <Campo label="Fecha de corte *">
          <input type="date" required value={fechaCorte} onChange={e => setFechaCorte(e.target.value)} className={inputCls} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Saldo inicial en libros"><input inputMode="decimal" value={saldoLibros} onChange={e => setSaldoLibros(e.target.value)} className={`${inputCls} font-mono`} /></Campo>
          <Campo label="Saldo inicial en banco"><input inputMode="decimal" value={saldoBanco} onChange={e => setSaldoBanco(e.target.value)} className={`${inputCls} font-mono`} /></Campo>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={onDemo} className="text-[#581c2f] font-semibold hover:underline inline-flex items-center gap-1"><Sparkles size={13} /> Usar datos de ejemplo</button>
          <div className="flex gap-2">
            <button type="button" onClick={onCerrar} className={btnSecundario}>Cancelar</button>
            <button type="submit" className={btnPrimario}>Crear</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function ModalCriterios({ criterios, onCerrar, onGuardar }: { criterios: CriteriosConciliacion; onCerrar: () => void; onGuardar: (c: CriteriosConciliacion) => void }) {
  const [c, setC] = useState(criterios);
  return (
    <Modal titulo="Criterios de conciliación automática" icono={<Settings2 className="h-5 w-5" />} onCerrar={onCerrar}>
      <div className="space-y-3.5 text-xs">
        <Campo label="Tolerancia de días entre Libros y Banco">
          <input type="number" min={0} max={60} value={c.toleranciaDias} onChange={e => setC({ ...c, toleranciaDias: Math.max(0, Number(e.target.value)) })} className={inputCls} />
        </Campo>
        <Campo label="Tolerancia de importe ($)">
          <input type="number" min={0} step="0.01" value={c.toleranciaImporte} onChange={e => setC({ ...c, toleranciaImporte: Math.max(0, Number(e.target.value)) })} className={inputCls} />
        </Campo>
        <label className="flex items-center gap-2 font-semibold text-slate-700">
          <input type="checkbox" checked={c.exigirReferencia} onChange={e => setC({ ...c, exigirReferencia: e.target.checked })} className="accent-[#581c2f]" />
          Exigir que coincida la referencia (REF-xxxx)
        </label>
        <p className="text-slate-500">
          Primero se emparejan movimientos con la misma referencia e importe; después, si no se exige referencia, por importe y la fecha más cercana dentro de la tolerancia.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCerrar} className={btnSecundario}>Cancelar</button>
          <button onClick={() => onGuardar(c)} className={btnPrimario}>Guardar</button>
        </div>
      </div>
    </Modal>
  );
}

function ModalProcesar({ periodo, reporte, onCerrar, onConfirmar }: { periodo: PeriodoConciliacion; reporte: ReporteConciliacion; onCerrar: () => void; onConfirmar: () => void }) {
  const pendientes = periodo.movimientos.filter(m => !m.conciliacionId).length;
  const conciliados = periodo.movimientos.length - pendientes;
  const cuadra = Math.abs(reporte.diferencia) < 0.005;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4" onClick={onCerrar}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-[#FFF8F1] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-red-700 px-6 py-4 flex items-center gap-2 text-white">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-extrabold tracking-wide">ADVERTENCIA</h3>
        </div>
        <div className="px-6 py-5 space-y-4 text-sm text-slate-700">
          <p>
            Se procesará la conciliación No. {periodo.numero} ({nombrePeriodo(periodo.fechaCorte)}): los <b>{pendientes}</b> movimientos no conciliados
            se copiarán a la conciliación No. {periodo.numero + 1}, los <b>{conciliados}</b> ya conciliados quedarán sólo en el histórico y se generarán los reportes General y Detallado.
          </p>
          {!cuadra && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
              La conciliación tiene una diferencia de <b>${formatMoneda(reporte.diferencia)}</b> sin aclarar. Revisa los saldos iniciales o los movimientos antes de cerrar.
            </p>
          )}
          <p className="font-bold text-red-700">
            Este proceso es IRREVERSIBLE: el periodo quedará marcado como Cerrado y no podrá modificarse ni volver a abrirse.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onCerrar} className={btnSecundario}>Cancelar</button>
            <button onClick={onConfirmar} className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800">
              <Lock size={14} /> Sí, procesar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalImportar({ origen, onCerrar, onImportar }: { origen: Origen; onCerrar: () => void; onImportar: (texto: string) => void }) {
  const [texto, setTexto] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const esLibros = origen === 'libros';
  return (
    <Modal titulo={`Importar movimientos de ${esLibros ? 'Libros' : 'Banco'}`} icono={<Upload className="h-5 w-5" />} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-3 text-xs">
        <p className="text-slate-600">
          Pega las celdas copiadas de Excel o carga un CSV con las columnas: <b>Fecha, Concepto, Referencia, {esLibros ? 'Cargo, Abono' : 'Abono (depósito), Cargo (retiro)'}</b>.
          También se acepta una sola columna <b>Importe</b> (positivo = depósito, negativo = retiro). Fechas DD/MM/AAAA o AAAA-MM-DD.
        </p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={10}
          placeholder={esLibros
            ? 'Fecha\tConcepto\tReferencia\tCargo\tAbono\n01/06/2026\tCobro de factura REF-10259\tREF-10259\t12500.00\t\n02/06/2026\tPago de nomina\tREF-11306\t\t39250.00'
            : 'Fecha\tConcepto\tReferencia\tAbono\tCargo\n01/06/2026\tSPEI recibido REF-10259\tREF-10259\t12500.00\t\n03/06/2026\tComision por manejo\t\t\t348.00'}
          className={`${inputCls} font-mono text-[11px]`}
        />
        <div className="flex items-center justify-between">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                if (f) setTexto(await f.text());
              }}
            />
            <button onClick={() => fileRef.current?.click()} className={btnSecundario}><FileSpreadsheet size={14} /> Cargar archivo CSV</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCerrar} className={btnSecundario}>Cancelar</button>
            <button disabled={!texto.trim()} onClick={() => onImportar(texto)} className={btnPrimario}><RefreshCw size={14} /> Importar</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ModalAgregar({ origen, fechaDefault, onCerrar, onAgregar }: {
  origen: Origen;
  fechaDefault: string;
  onCerrar: () => void;
  onAgregar: (d: { fecha: string; concepto: string; referencia: string; deposito: number; retiro: number }) => void;
}) {
  const [fecha, setFecha] = useState(fechaDefault);
  const [concepto, setConcepto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [tipo, setTipo] = useState<'deposito' | 'retiro'>('deposito');
  const [importe, setImporte] = useState('');
  const esLibros = origen === 'libros';
  return (
    <Modal titulo={`Agregar movimiento a ${esLibros ? 'Libros' : 'Banco'}`} icono={<Plus className="h-5 w-5" />} onCerrar={onCerrar}>
      <form
        className="space-y-3.5 text-xs"
        onSubmit={e => {
          e.preventDefault();
          const n = parseFloat(importe.replace(/,/g, ''));
          if (!concepto.trim() || !(n > 0)) return;
          onAgregar({ fecha, concepto, referencia, deposito: tipo === 'deposito' ? n : 0, retiro: tipo === 'retiro' ? n : 0 });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha *"><input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Tipo *">
            <select value={tipo} onChange={e => setTipo(e.target.value as 'deposito' | 'retiro')} className={inputCls}>
              <option value="deposito">{esLibros ? 'Cargo (depósito)' : 'Abono (depósito)'}</option>
              <option value="retiro">{esLibros ? 'Abono (retiro)' : 'Cargo (retiro)'}</option>
            </select>
          </Campo>
        </div>
        <Campo label="Concepto *"><input required value={concepto} onChange={e => setConcepto(e.target.value)} className={inputCls} /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Referencia"><input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="REF-10000" className={inputCls} /></Campo>
          <Campo label="Importe *"><input required inputMode="decimal" value={importe} onChange={e => setImporte(e.target.value)} className={`${inputCls} font-mono`} /></Campo>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className={btnSecundario}>Cancelar</button>
          <button type="submit" className={btnPrimario}>Agregar</button>
        </div>
      </form>
    </Modal>
  );
}
