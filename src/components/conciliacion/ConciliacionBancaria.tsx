'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileText, Link2, Lock,
  Plus, RefreshCw, Search, Settings2, Sparkles, Trash2, Unlink, Upload, Wand2, X
} from 'lucide-react';
import {
  agregarMovimientos, conciliarAutomatico, conciliarManual, construirReporte, crearPeriodo,
  desconciliar, desconciliarTodo, eliminarMovimiento, formatFecha, formatMoneda, neto,
  nombrePeriodo, nuevoMovimiento, parseMovimientosCsv, procesarConciliacion, reabrirConciliacion, round2,
  saldoFinal, totalesLado, type CriteriosConciliacion, type Movimiento, type Origen,
  type PeriodoConciliacion, type ReporteConciliacion
} from '@/lib/conciliacion/engine';
import { deleteConciliacion, fetchConciliaciones, leerConciliacionesLocales, saveConciliaciones } from '@/lib/conciliacion/store';
import { crearPeriodoDemo } from '@/lib/conciliacion/demo';
import { cargarRecursosNavegador, descargarArchivo } from '@/lib/conciliacion/assets';
import { formatoDe, formatoPorDefecto, nombreArchivoOficial, type FormatoOficial } from '@/lib/conciliacion/formatoOficial';
import { analizarAuxiliar, extraerTextoPdf } from '@/lib/conciliacion/importarAuxiliar';
import { excelATexto } from '@/lib/conciliacion/importarExcel';
import { analizarEstadoCuenta, type EstadoCuentaImportado } from '@/lib/conciliacion/importarEstadoCuenta';
import { ModalFormato, VistaAuxiliar, VistaConciliacionOficial } from './FormatoOficial';
import { fetchBancos, type CuentaBancariaRecord } from '@/lib/crudService';
import { logAuditOperation } from '@/lib/auditService';

type Filtro = 'todos' | 'conciliados' | 'pendientes';
type Vista = 'seguimiento' | 'conciliacion' | 'auxiliar';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** "1112 0015 0000 0000 0001" → "1112-15-0-0-01" */
const cuentaContableDesdeCodigo = (codigo: string) =>
  codigo
    .trim()
    .split(/\s+/)
    .map((g, i) => (i === 0 ? g : String(Number(g)).padStart(i === 4 ? 2 : 1, '0')))
    .join('-');

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

  const [modal, setModal] = useState<null | 'nueva' | 'criterios' | 'procesar' | 'formato' | { tipo: 'importar' | 'agregar'; origen: Origen }>(null);
  const [generando, setGenerando] = useState<null | 'excel' | 'pdf' | 'auxiliar'>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const notificar = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Carga inicial: primero lo guardado en este navegador, luego se combina con la nube ──
  useEffect(() => {
    const elegir = (ps: PeriodoConciliacion[]) => {
      const abierto = [...ps].reverse().find(p => p.estado === 'abierto') ?? ps[ps.length - 1];
      if (abierto) {
        setCuentaId(prev => prev || abierto.cuentaId);
        setPeriodoId(prev => (prev && ps.some(p => p.id === prev) ? prev : abierto.id));
      }
    };
    const locales = leerConciliacionesLocales();
    if (locales.length) {
      setPeriodos(locales);
      elegir(locales);
      setCargando(false);
    }
    (async () => {
      const [{ periodos: ps, resincronizados }, bs] = await Promise.all([fetchConciliaciones(), fetchBancos()]);
      setPeriodos(ps);
      setBancos(bs);
      elegir(ps);
      if (resincronizados) console.info(`${resincronizados} conciliación(es) se volvieron a sincronizar con la nube.`);
      setCargando(false);
    })();
  }, []);

  const cuentas = useMemo(() => {
    const map = new Map<string, string>();
    periodos.forEach(p => map.set(p.cuentaId, `${p.banco} ${p.cuenta}${p.cuentaId.startsWith('demo-') ? ' (datos de ejemplo)' : ''}`));
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

  /** Guarda en el navegador y en la nube; avisa si la nube rechaza el guardado */
  const guardar = (lista: PeriodoConciliacion[]) => {
    void saveConciliaciones(lista).then(error => {
      if (error) {
        setTimeout(
          () =>
            notificar(
              `Los cambios quedaron guardados en este navegador, pero la nube (Supabase) los rechazó: ${error}. Ejecuta de nuevo supabase/conciliacion_schema.sql.`,
              true
            ),
          4700
        );
      }
    });
  };

  /** Aplica un cambio al periodo activo y lo persiste */
  const aplicar = (fn: (p: PeriodoConciliacion) => PeriodoConciliacion, okMsg?: string) => {
    if (!periodo) return;
    try {
      const nuevo = fn(periodo);
      setPeriodos(prev => prev.map(p => (p.id === nuevo.id ? nuevo : p)));
      guardar([nuevo]);
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
      guardar([c, siguiente]);
      void logAuditOperation({
        modulo: 'Bancos',
        accion: `Se procesó la conciliación No. ${c.numero} de ${c.banco} ${c.cuenta}`,
        detalles: `${c.cierre!.conciliados} conciliados • ${c.cierre!.pendientesArrastrados} pendientes arrastrados a la No. ${siguiente.numero}`
      });
      // Se queda en la conciliación recién cerrada para descargar sus documentos
      setPeriodoId(c.id);
      setVista('conciliacion');
      setModal(null);
      limpiarSeleccion();
      notificar(`Conciliación No. ${c.numero} cerrada. Descarga aquí sus documentos; la No. ${siguiente.numero} quedó abierta con ${siguiente.movimientos.length} pendientes.`);
    } catch (err) {
      notificar((err as Error).message, true);
    }
  };

  /** Conciliación abierta más reciente de la cuenta (a donde ir después de cerrar) */
  const abiertaDeCuenta = periodo ? periodos.find(p => p.cuentaId === periodo.cuentaId && p.estado === 'abierto') : undefined;
  const siguienteDe = (p: PeriodoConciliacion) => periodos.find(x => x.cuentaId === p.cuentaId && x.numero === p.numero + 1);

  const onReabrir = async () => {
    if (!periodo || !cerrado) return;
    try {
      const sig = siguienteDe(periodo);
      const { reabierto, descartar, movimientosPropiosSiguiente } = reabrirConciliacion(periodo, sig);
      const aviso = descartar
        ? `\n\nSe eliminará la conciliación No. ${descartar.numero} que se generó al procesar${
            movimientosPropiosSiguiente ? `, incluidos ${movimientosPropiosSiguiente} movimientos que ya le habías capturado` : ''
          }; al volver a procesar se genera de nuevo.`
        : '';
      if (!confirm(`¿Reabrir la conciliación No. ${periodo.numero} para corregirla?${aviso}`)) return;
      if (descartar) {
        const err = await deleteConciliacion(descartar.id);
        if (err) notificar(`No se pudo eliminar la No. ${descartar.numero} en la nube: ${err}`, true);
      }
      setPeriodos(prev => prev.filter(p => p.id !== descartar?.id).map(p => (p.id === reabierto.id ? reabierto : p)));
      guardar([reabierto]);
      setVista('seguimiento');
      void logAuditOperation({ modulo: 'Bancos', accion: `Se reabrió la conciliación No. ${reabierto.numero} de ${reabierto.banco} ${reabierto.cuenta}`, status: 'advertencia' });
      notificar(`Conciliación No. ${reabierto.numero} reabierta. Ya puedes corregirla y volver a procesarla.`);
    } catch (err) {
      notificar((err as Error).message, true);
    }
  };

  /** Descarga la conciliación (Excel o PDF) o el auxiliar en PDF con el formato oficial */
  const descargar = async (tipo: 'excel' | 'pdf' | 'auxiliar') => {
    if (!periodo || generando) return;
    setGenerando(tipo);
    try {
      const recursos = await cargarRecursosNavegador();
      if (tipo === 'excel') {
        const { generarExcelConciliacion } = await import('@/lib/conciliacion/excelOficial');
        const datos = await generarExcelConciliacion(periodo, recursos);
        descargarArchivo(datos, `${nombreArchivoOficial(periodo, 'CONC')}.xlsx`, MIME_XLSX);
      } else {
        const pdf = await import('@/lib/conciliacion/pdfOficial');
        const datos = tipo === 'pdf' ? await pdf.generarPdfConciliacionOficial(periodo, recursos) : await pdf.generarPdfAuxiliar(periodo, recursos);
        descargarArchivo(datos, `${nombreArchivoOficial(periodo, tipo === 'pdf' ? 'CONC' : 'AUX')}.pdf`, 'application/pdf');
      }
    } catch (err) {
      console.error(err);
      notificar(`No se pudo generar el archivo: ${(err as Error).message}`, true);
    } finally {
      setGenerando(null);
    }
  };

  /** Importa el reporte "Auxiliares del mes" (PDF del sistema contable) como movimientos de Libros */
  const onImportarAuxiliar = async (archivo: File, arrastrado: boolean) => {
    if (!periodo) return;
    try {
      const aux = analizarAuxiliar(await extraerTextoPdf(await archivo.arrayBuffer()), periodo.numero);
      if (aux.movimientos.length === 0) throw new Error(aux.advertencias[0] ?? 'No se encontraron movimientos en el auxiliar.');
      if (
        aux.fechaCorte &&
        aux.fechaCorte !== periodo.fechaCorte &&
        !confirm(`El auxiliar es al ${formatFecha(aux.fechaCorte)} y esta conciliación tiene corte al ${formatFecha(periodo.fechaCorte)}. ¿Importarlo de todos modos?`)
      )
        return;
      const existentes = periodo.movimientos.filter(m => m.origen === 'libros' && !m.arrastrado);
      const reemplazar =
        existentes.length > 0 &&
        confirm(`Ya hay ${existentes.length} movimientos de Libros en este periodo. ¿Reemplazarlos por los del auxiliar?\n\nAceptar = reemplazar · Cancelar = agregarlos`);
      const movs = aux.movimientos.map(m => ({ ...m, arrastrado }));
      aplicar(p => {
        let base = p;
        if (reemplazar) for (const m of existentes) base = eliminarMovimiento(base, m.id);
        const f = formatoDe(base);
        const detalle = aux.jerarquia[aux.jerarquia.length - 1];
        return {
          ...agregarMovimientos(base, movs),
          saldoInicialLibros: arrastrado ? base.saldoInicialLibros : aux.saldoInicial,
          formato: {
            ...f,
            entidad: aux.entidad || f.entidad,
            jerarquia: aux.jerarquia.length ? aux.jerarquia : f.jerarquia,
            cuentaContable: f.cuentaContable || (detalle ? cuentaContableDesdeCodigo(detalle.codigo) : '')
          }
        };
      }, `Auxiliar importado: ${aux.movimientos.length} movimientos · Debe ${formatMoneda(aux.totalDebe)} · Haber ${formatMoneda(aux.totalHaber)} · Saldo final ${formatMoneda(aux.saldoFinal)}.`);
      if (aux.advertencias.length) setTimeout(() => notificar(aux.advertencias.join(' '), true), 4600);
      setModal(null);
    } catch (err) {
      console.error(err);
      notificar(`No se pudo leer el auxiliar: ${(err as Error).message}`, true);
    }
  };

  /** Agrega los movimientos leídos del estado de cuenta en PDF (ya revisados en la vista previa) */
  const onImportarEstadoCuenta = (r: EstadoCuentaImportado, usarSaldos: boolean, arrastrado: boolean) => {
    const movs = r.movimientos.map(m => ({ ...m, arrastrado }));
    aplicar(p => {
      let nuevo = agregarMovimientos(p, movs);
      if (usarSaldos && !arrastrado) {
        if (r.saldoInicial !== undefined) nuevo = { ...nuevo, saldoInicialBanco: r.saldoInicial };
        if (r.saldoFinal !== undefined) nuevo = { ...nuevo, saldoBancoCorte: r.saldoFinal };
      }
      return nuevo;
    }, `Estado de cuenta importado: ${movs.length} movimientos · Abonos ${formatMoneda(r.totalAbonos)} · Cargos ${formatMoneda(r.totalCargos)}${r.saldoFinal !== undefined ? ` · Saldo final ${formatMoneda(r.saldoFinal)}` : ''}.`);
    setModal(null);
  };

  const onImportarTexto = (texto: string, origen: Origen, arrastrado: boolean) => {
    if (!periodo) return;
    const { movimientos, errores } = parseMovimientosCsv(texto, origen, periodo.numero, { arrastrado });
    if (movimientos.length === 0) {
      notificar(errores[0] ?? 'No se encontraron movimientos.', true);
      return;
    }
    aplicar(
      p => agregarMovimientos(p, movimientos),
      `${movimientos.length} movimientos importados a ${origen === 'libros' ? 'Libros' : 'Banco'}${errores.length ? ` (${errores.length} filas omitidas)` : ''}.`
    );
    setModal(null);
  };

  const onGuardarFormato = (f: FormatoOficial, saldoBancoCorte: number | undefined) => {
    aplicar(p => {
      if (p.estado !== 'abierto') throw new Error('El periodo está cerrado y no puede modificarse.');
      const { saldoBancoCorte: _omit, ...resto } = p;
      void _omit;
      return saldoBancoCorte === undefined ? { ...resto, formato: f } : { ...resto, formato: f, saldoBancoCorte };
    }, 'Datos del formato guardados.');
    setModal(null);
  };

  const onCrear = (nuevoBase: PeriodoConciliacion) => {
    // Hereda los datos del formato (firmas, encabezados, jerarquía) del último periodo de la misma cuenta
    const previo = periodos.filter(p => p.cuentaId === nuevoBase.cuentaId && p.formato).sort((a, b) => b.numero - a.numero)[0];
    const nuevo: PeriodoConciliacion = {
      ...nuevoBase,
      formato: nuevoBase.formato ?? (previo?.formato ? { ...previo.formato, fechaElaboracion: undefined } : formatoPorDefecto(nuevoBase))
    };
    setPeriodos(prev => [...prev, nuevo]);
    guardar([nuevo]);
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
            {periodo?.cuentaId.startsWith('demo-') && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold border bg-amber-50 text-amber-700 border-amber-200">Datos de ejemplo</span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Concilia Libros contra el Estado de Cuenta, cierra el periodo arrastrando pendientes y genera la conciliación y el auxiliar en el formato oficial (Excel y PDF).
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
              <button disabled={cerrado} onClick={() => setModal('formato')} className={btnSecundario}><Settings2 size={14} /> Datos del formato</button>
            </Grupo>
            <Grupo titulo="Acciones">
              <button disabled={cerrado} onClick={onAutomatica} className={btnSecundario}><Wand2 size={14} /> Conciliación automática</button>
              <button disabled={cerrado} onClick={() => setModal('criterios')} className={btnSecundario}><Settings2 size={14} /> Criterios</button>
              <button disabled={cerrado} onClick={onDesconciliarTodo} className={btnSecundario}><Unlink size={14} /> Des-conciliar todo</button>
            </Grupo>
            <Grupo titulo="Proceso">
              <button disabled={cerrado} title={cerrado ? 'Esta conciliación ya está cerrada' : undefined} onClick={() => setModal('procesar')} className={btnPrimario}><Lock size={14} /> Procesar conciliación</button>
            </Grupo>
            <Grupo titulo="Formato oficial">
              <button disabled={!!generando} onClick={() => descargar('excel')} className={btnSecundario}>
                <FileSpreadsheet size={14} /> {generando === 'excel' ? 'Generando…' : 'Conciliación Excel'}
              </button>
              <button disabled={!!generando} onClick={() => descargar('pdf')} className={btnSecundario}>
                <Download size={14} /> {generando === 'pdf' ? 'Generando…' : 'Conciliación PDF'}
              </button>
              <button disabled={!!generando} onClick={() => descargar('auxiliar')} className={btnSecundario}>
                <FileText size={14} /> {generando === 'auxiliar' ? 'Generando…' : 'Auxiliar PDF'}
              </button>
            </Grupo>
            {!cerrado && (
              <button onClick={onEliminarPeriodo} title="Eliminar conciliación" className="ml-auto p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {cerrado && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex flex-wrap items-center gap-3">
              <Lock size={16} className="shrink-0" />
              <div className="flex-1 min-w-[260px]">
                <p className="font-bold">
                  Estás viendo la conciliación No. {periodo.numero} ({nombrePeriodo(periodo.fechaCorte)}), que ya está cerrada
                  {periodo.cierre ? ` desde el ${new Date(periodo.cierre.fechaCierre).toLocaleDateString('es-MX')}` : ''}.
                </p>
                <p>
                  Por eso no se puede volver a procesar ni editar. Puedes descargar sus documentos (Excel y PDF) con los botones de &quot;Formato oficial&quot;
                  {abiertaDeCuenta ? `, continuar en la No. ${abiertaDeCuenta.numero} (abierta)` : ''} o reabrirla si la cerraste por error.
                </p>
              </div>
              {abiertaDeCuenta && (
                <button onClick={() => { setPeriodoId(abiertaDeCuenta.id); limpiarSeleccion(); }} className={btnPrimario}>
                  Ir a la No. {abiertaDeCuenta.numero} (abierta)
                </button>
              )}
              {(!siguienteDe(periodo) || siguienteDe(periodo)!.estado === 'abierto') && (
                <button onClick={onReabrir} className={btnSecundario}>
                  <Unlink size={14} /> Reabrir esta conciliación
                </button>
              )}
            </div>
          )}

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
              ['conciliacion', 'Conciliación (formato oficial)'],
              ['auxiliar', 'Auxiliar del mes']
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

          {vista === 'conciliacion' && (
            <VistaConciliacionOficial
              periodo={periodo}
              onExcel={() => descargar('excel')}
              onPdf={() => descargar('pdf')}
              onFormato={cerrado ? undefined : () => setModal('formato')}
            />
          )}
          {vista === 'auxiliar' && <VistaAuxiliar periodo={periodo} onPdf={() => descargar('auxiliar')} />}
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
      {modal === 'formato' && periodo && (
        <ModalFormato periodo={periodo} onCerrar={() => setModal(null)} onGuardar={onGuardarFormato} />
      )}
      {modal && typeof modal === 'object' && modal.tipo === 'importar' && periodo && (
        <ModalImportar
          origen={modal.origen}
          onCerrar={() => setModal(null)}
          onImportar={(texto, arrastrado) => onImportarTexto(texto, modal.origen, arrastrado)}
          onImportarAuxiliar={onImportarAuxiliar}
          onImportarEstadoCuenta={onImportarEstadoCuenta}
          fechaCorte={periodo.fechaCorte}
          periodoNumero={periodo.numero}
          onError={msg => notificar(msg, true)}
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
  const mesCorte = periodo.fechaCorte.slice(0, 7);
  const fueraDeMes = periodo.movimientos.filter(m => !m.arrastrado && m.fecha.slice(0, 7) !== mesCorte);
  const esEjemplo = periodo.cuentaId.startsWith('demo-');
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
            se copiarán a la conciliación No. {periodo.numero + 1}, los <b>{conciliados}</b> ya conciliados quedarán sólo en el histórico. La conciliación y el auxiliar de este periodo seguirán disponibles para descargar.
          </p>
          {fueraDeMes.length > 0 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
              <b>{fueraDeMes.length} movimiento(s) no son de {nombrePeriodo(periodo.fechaCorte)}</b> (por ejemplo del {formatFecha(fueraDeMes[0].fecha)}).
              Revisa que estés en la conciliación del mes correcto antes de cerrar.
            </p>
          )}
          {esEjemplo && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 text-xs">
              Esta es la cuenta de <b>datos de ejemplo</b>. Para tus conciliaciones reales crea una con <b>Nueva conciliación</b>.
            </p>
          )}
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

function ModalImportar({
  origen,
  onCerrar,
  onImportar,
  onImportarAuxiliar,
  onImportarEstadoCuenta,
  fechaCorte,
  periodoNumero,
  onError
}: {
  origen: Origen;
  onCerrar: () => void;
  onImportar: (texto: string, arrastrado: boolean) => void;
  onImportarAuxiliar: (archivo: File, arrastrado: boolean) => Promise<void>;
  onImportarEstadoCuenta: (r: EstadoCuentaImportado, usarSaldos: boolean, arrastrado: boolean) => void;
  fechaCorte: string;
  periodoNumero: number;
  onError: (msg: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [arrastrado, setArrastrado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const auxRef = useRef<HTMLInputElement>(null);
  const ecRef = useRef<HTMLInputElement>(null);
  const [vistaPrevia, setVistaPrevia] = useState<EstadoCuentaImportado | null>(null);
  const [usarSaldos, setUsarSaldos] = useState(true);
  const esLibros = origen === 'libros';

  const leerEstadoCuenta = async (f: File) => {
    try {
      setLeyendo(true);
      const r = analizarEstadoCuenta(await extraerTextoPdf(await f.arrayBuffer()), { fechaCorte, periodoOrigen: periodoNumero });
      if (r.movimientos.length === 0) onError(r.advertencias[0] ?? 'No se encontraron movimientos en el estado de cuenta.');
      else setVistaPrevia(r);
    } catch (err) {
      onError(`No se pudo leer el estado de cuenta: ${(err as Error).message}`);
    } finally {
      setLeyendo(false);
    }
  };

  /** Por si el banco presenta las columnas al revés: intercambia cargos y abonos */
  const intercambiar = () =>
    setVistaPrevia(v =>
      v && {
        ...v,
        totalAbonos: v.totalCargos,
        totalCargos: v.totalAbonos,
        movimientos: v.movimientos.map(m => ({ ...m, deposito: m.retiro, retiro: m.deposito }))
      }
    );

  if (vistaPrevia) {
    const r = vistaPrevia;
    return (
      <Modal titulo="Vista previa del estado de cuenta" icono={<FileText className="h-5 w-5" />} onCerrar={onCerrar} ancho="max-w-4xl">
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              ['Movimientos', String(r.movimientos.length)],
              ['Saldo inicial', r.saldoInicial !== undefined ? formatMoneda(r.saldoInicial) : '—'],
              ['Abonos', formatMoneda(r.totalAbonos)],
              ['Cargos', formatMoneda(r.totalCargos)],
              ['Saldo final', r.saldoFinal !== undefined ? formatMoneda(r.saldoFinal) : '—']
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[#E8E2D9] px-3 py-2">
                <p className="text-[10px] text-slate-500">{k}</p>
                <p className="font-mono font-bold text-slate-900">{v}</p>
              </div>
            ))}
          </div>
          {r.advertencias.length > 0 ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800 space-y-1">
              {r.advertencias.map(a => (
                <p key={a}>⚠ {a}</p>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
              ✓ Los saldos cuadran: saldo inicial + abonos − cargos = saldo final{r.metodo === 'saldo' ? ' (cargos y abonos identificados con la variación del saldo)' : ''}.
            </p>
          )}
          <div className="max-h-[340px] overflow-auto rounded-xl border border-[#E8E2D9]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#FDFBF9] text-[11px] text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1.5">Fecha</th>
                  <th className="text-left px-2 py-1.5">Concepto</th>
                  <th className="text-right px-2 py-1.5">Abono</th>
                  <th className="text-right px-2 py-1.5">Cargo</th>
                </tr>
              </thead>
              <tbody>
                {r.movimientos.map(m => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-2 py-1 font-mono whitespace-nowrap">{formatFecha(m.fecha)}</td>
                    <td className="px-2 py-1">{m.concepto}</td>
                    <td className="px-2 py-1 text-right font-mono">{m.deposito ? formatMoneda(m.deposito) : ''}</td>
                    <td className="px-2 py-1 text-right font-mono">{m.retiro ? formatMoneda(m.retiro) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!arrastrado && (r.saldoInicial !== undefined || r.saldoFinal !== undefined) && (
            <label className="flex items-center gap-2 text-slate-700">
              <input type="checkbox" checked={usarSaldos} onChange={e => setUsarSaldos(e.target.checked)} className="accent-[#581c2f]" />
              Usar el saldo inicial y el saldo final de este estado de cuenta en la conciliación
            </label>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button onClick={() => setVistaPrevia(null)} className={btnSecundario}>Volver</button>
              <button onClick={intercambiar} className={btnSecundario}>Intercambiar cargos y abonos</button>
            </div>
            <button onClick={() => onImportarEstadoCuenta(r, usarSaldos, arrastrado)} className={btnPrimario}>
              <RefreshCw size={14} /> Importar {r.movimientos.length} movimientos
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const cargarArchivo = async (f: File) => {
    try {
      setLeyendo(true);
      if (/\.xlsx$/i.test(f.name)) setTexto(await excelATexto(await f.arrayBuffer()));
      else setTexto(await f.text());
    } catch (err) {
      onError(`No se pudo leer el archivo: ${(err as Error).message}`);
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <Modal titulo={`Importar movimientos de ${esLibros ? 'Libros' : 'Banco'}`} icono={<Upload className="h-5 w-5" />} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="space-y-3 text-xs">
        {esLibros && (
          <div className="rounded-xl border border-[#EED7DC] bg-[#FBF0F3] p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <p className="font-bold text-[#581c2f]">Auxiliar del sistema contable (PDF)</p>
              <p className="text-slate-600">
                Carga el reporte <b>&quot;AUXILIARES DEL MES&quot;</b> de la cuenta: se importan pólizas, MOV, fechas, conceptos, cargos/abonos, saldo inicial y la jerarquía de cuentas.
              </p>
            </div>
            <input
              ref={auxRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setLeyendo(true);
                await onImportarAuxiliar(f, arrastrado);
                setLeyendo(false);
              }}
            />
            <button disabled={leyendo} onClick={() => auxRef.current?.click()} className={btnPrimario}>
              <FileText size={14} /> {leyendo ? 'Leyendo…' : 'Importar auxiliar PDF'}
            </button>
          </div>
        )}
        {!esLibros && (
          <div className="rounded-xl border border-[#EED7DC] bg-[#FBF0F3] p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <p className="font-bold text-[#581c2f]">Estado de cuenta del banco (PDF)</p>
              <p className="text-slate-600">
                Carga el estado de cuenta en PDF tal como lo descargas de la banca en línea. Se leen fechas, conceptos, cargos, abonos y saldos, y verás una vista previa antes de importar.
              </p>
            </div>
            <input
              ref={ecRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) await leerEstadoCuenta(f);
              }}
            />
            <button disabled={leyendo} onClick={() => ecRef.current?.click()} className={btnPrimario}>
              <FileText size={14} /> {leyendo ? 'Leyendo…' : 'Estado de cuenta PDF'}
            </button>
          </div>
        )}
        <p className="text-slate-600">
          {'O pega'} las celdas copiadas de Excel, o carga un archivo Excel/CSV, con las columnas: <b>Fecha, Concepto, Referencia, {esLibros ? 'Cargo, Abono' : 'Abono (depósito), Cargo (retiro)'}</b>
          {esLibros && <> y, opcionalmente, <b>Póliza, Cheque, Beneficiario</b></>}. También se acepta una sola columna <b>Importe</b> (positivo = depósito, negativo = retiro). Fechas DD/MM/AAAA o AAAA-MM-DD.
        </p>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={9}
          placeholder={esLibros
            ? 'Fecha\tConcepto\tPóliza\tCheque\tBeneficiario\tCargo\tAbono\n05/08/2026\tPago a proveedor\tE-21\t1045\tEMPACADORA FRESNO S.A. DE C.V.\t\t3030000.00'
            : 'Fecha\tConcepto\tReferencia\tAbono\tCargo\n14/08/2026\tTRANSFERENCIA SPEI POLIZA 1005428 - SEGUROS BANORTE\t\t\t35281.85'}
          className={`${inputCls} font-mono text-[11px]`}
        />
        <label className="flex items-start gap-2 text-slate-700">
          <input type="checkbox" checked={arrastrado} onChange={e => setArrastrado(e.target.checked)} className="mt-0.5 accent-[#581c2f]" />
          <span>
            <b>Son partidas pendientes de periodos anteriores.</b> Úsalo al empezar a usar el módulo para capturar lo que traía tu última conciliación
            (no afectan el saldo del mes, sólo aparecen como pendientes).
          </span>
        </label>
        <div className="flex items-center justify-between">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,.txt,.tsv"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) await cargarArchivo(f);
              }}
            />
            <button disabled={leyendo} onClick={() => fileRef.current?.click()} className={btnSecundario}><FileSpreadsheet size={14} /> Cargar Excel o CSV</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCerrar} className={btnSecundario}>Cancelar</button>
            <button disabled={!texto.trim()} onClick={() => onImportar(texto, arrastrado)} className={btnPrimario}><RefreshCw size={14} /> Importar</button>
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
  onAgregar: (d: {
    fecha: string;
    concepto: string;
    referencia: string;
    deposito: number;
    retiro: number;
    poliza?: string;
    cheque?: string;
    beneficiario?: string;
    arrastrado?: boolean;
  }) => void;
}) {
  const [fecha, setFecha] = useState(fechaDefault);
  const [concepto, setConcepto] = useState('');
  const [referencia, setReferencia] = useState('');
  const [poliza, setPoliza] = useState('');
  const [cheque, setCheque] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [arrastrado, setArrastrado] = useState(false);
  const [tipo, setTipo] = useState<'deposito' | 'retiro'>(origen === 'libros' ? 'retiro' : 'deposito');
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
          onAgregar({
            fecha,
            concepto,
            referencia: referencia || poliza,
            deposito: tipo === 'deposito' ? n : 0,
            retiro: tipo === 'retiro' ? n : 0,
            poliza: esLibros ? poliza : undefined,
            cheque: esLibros ? cheque : undefined,
            beneficiario: esLibros ? beneficiario : undefined,
            arrastrado
          });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Fecha *"><input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} /></Campo>
          <Campo label="Tipo *">
            <select value={tipo} onChange={e => setTipo(e.target.value as 'deposito' | 'retiro')} className={inputCls}>
              <option value="deposito">{esLibros ? 'Cargo (depósito)' : 'Abono (depósito)'}</option>
              <option value="retiro">{esLibros ? 'Abono (retiro / cheque)' : 'Cargo (retiro)'}</option>
            </select>
          </Campo>
        </div>
        <Campo label="Concepto *"><input required value={concepto} onChange={e => setConcepto(e.target.value)} className={inputCls} /></Campo>
        {esLibros && (
          <div className="grid grid-cols-3 gap-3">
            <Campo label="Póliza"><input value={poliza} onChange={e => setPoliza(e.target.value)} placeholder="E-21" className={inputCls} /></Campo>
            <Campo label="No. de cheque"><input value={cheque} onChange={e => setCheque(e.target.value)} className={inputCls} /></Campo>
            <Campo label="Beneficiario"><input value={beneficiario} onChange={e => setBeneficiario(e.target.value)} className={inputCls} /></Campo>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Referencia"><input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="REF-10000" className={inputCls} /></Campo>
          <Campo label="Importe *"><input required inputMode="decimal" value={importe} onChange={e => setImporte(e.target.value)} className={`${inputCls} font-mono`} /></Campo>
        </div>
        <label className="flex items-center gap-2 text-slate-700">
          <input type="checkbox" checked={arrastrado} onChange={e => setArrastrado(e.target.checked)} className="accent-[#581c2f]" />
          Partida pendiente de un periodo anterior (no afecta el saldo del mes)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className={btnSecundario}>Cancelar</button>
          <button type="submit" className={btnPrimario}>Agregar</button>
        </div>
      </form>
    </Modal>
  );
}
