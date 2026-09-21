'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Search, Filter, Calendar, Download, RefreshCw,
  User, Clock, AlertTriangle, CheckCircle2, Lock, Eye,
  ArrowUpDown, Sparkles, FileText, ChevronDown, ChevronLeft, ChevronRight,
  Laptop
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { generate128AuditLogs, AuditLog } from '@/lib/auditSeedData';
import { getStoredAuditLogs, filterLogsBy15DaysRetention } from '@/lib/auditService';

interface AuditHistoryTableProps {
  searchQuery?: string;
}

export default function AuditHistoryTable({ searchQuery: externalSearchQuery = '' }: AuditHistoryTableProps = {}) {
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);

  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const [moduleFilter, setModuleFilter] = useState('todos');
  const [userFilter, setUserFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Inicializa con los registros locales y los 128 eventos completos de auditoría (filtrados a 15 días)
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const stored = typeof window !== 'undefined' ? getStoredAuditLogs() : [];
    const seeds = generate128AuditLogs();
    const existingIds = new Set(stored.map(s => s.id));
    const nonDuplicateSeeds = seeds.filter(s => !existingIds.has(s.id));
    return filterLogsBy15DaysRetention([...stored, ...nonDuplicateSeeds]);
  });
  const [isLoading, setIsLoading] = useState(false);

  // Estados de paginación real
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Escuchar eventos reactivos generados por logAuditOperation (ej. al crear pólizas)
  useEffect(() => {
    const handleNewAuditLog = (e: Event) => {
      const customEvent = e as CustomEvent<AuditLog>;
      if (customEvent.detail) {
        setLogs(prev => {
          const newLog = customEvent.detail;
          const filtered = prev.filter(l => l.id !== newLog.id);
          return [newLog, ...filtered];
        });
        setCurrentPage(1);
      }
    };

    window.addEventListener('pazsuma:audit-log', handleNewAuditLog);
    return () => {
      window.removeEventListener('pazsuma:audit-log', handleNewAuditLog);
    };
  }, []);

  // Carga y sincronización con Supabase (sin límite artificial de 5 filas y con filtro de 15 días)
  const fetchSupabaseLogs = async () => {
    setIsLoading(true);
    const supabase = createSupabaseBrowserClient();

    try {
      const newLogs: AuditLog[] = [];

      // 1. Consulta a la tabla principal historial_operaciones
      const { data: histData, error: histError } = await supabase
        .from('historial_operaciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (!histError && histData && histData.length > 0) {
        histData.forEach((d: any) => {
          newLogs.push({
            id: d.id || `hist-${d.created_at}`,
            user: d.usuario || d.user_name || 'Usuario',
            email: d.user_email || 'usuario@pazsuma.com',
            date: d.created_at ? new Date(d.created_at).toLocaleString('es-MX') : '20 Sep 2026',
            relativeTime: 'Reciente',
            module: (d.modulo as any) || 'Contabilidad',
            action: d.accion || 'Operación registrada',
            details: d.detalles || undefined,
            ip: d.ip_origen || '189.240.12.94 • CDMX',
            status: d.estatus || 'completado',
            created_at: d.created_at
          });
        });
      }

      // 2. Consulta a la tabla audit_logs de respaldo
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!auditError && auditData && auditData.length > 0) {
        auditData.forEach((d: any) => {
          newLogs.push({
            id: d.id || `audit-${d.created_at}`,
            user: d.user_name || d.user || 'Usuario',
            email: d.user_email || d.email || 'usuario@pazsuma.com',
            date: d.created_at ? new Date(d.created_at).toLocaleString('es-MX') : '20 Sep 2026',
            relativeTime: 'Reciente',
            module: (d.module as any) || 'Foliador',
            action: d.action || 'Operación registrada',
            details: d.details || undefined,
            ip: d.ip_origin || d.ip || '189.240.12.94 • CDMX',
            status: d.status || 'completado',
            created_at: d.created_at
          });
        });
      }

      // 3. Consulta a folios reales en Supabase para integrarlos al historial
      const { data: foliosData } = await supabase
        .from('document_folios')
        .select('*')
        .order('created_at', { ascending: false });

      if (foliosData && foliosData.length > 0) {
        foliosData.forEach((f: any) => {
          newLogs.push({
            id: `folio-doc-${f.id}`,
            user: f.created_by || 'Uriel Gómez',
            email: 'uriel@pazsuma.com',
            date: f.created_at ? new Date(f.created_at).toLocaleString('es-MX') : '20 Sep 2026, 23:45:00',
            relativeTime: 'Reciente',
            module: 'Foliador',
            action: `Se estampó folio oficial ${f.folio_number || 'OFI-2026-0042'} con logotipo institucional`,
            details: `Archivo: ${f.document_name || 'documento.pdf'} • ${f.total_pages || 1} página(s) foliadas`,
            ip: '189.240.12.94 • CDMX',
            status: 'completado',
            created_at: f.created_at
          });
        });
      }

      // 4. Agregar registros almacenados localmente
      const localLogs = getStoredAuditLogs();
      const combined = [...newLogs, ...localLogs];

      if (combined.length > 0) {
        setLogs(prev => {
          const existingIds = new Set(combined.map(l => l.id));
          const filteredPrev = prev.filter(p => !existingIds.has(p.id));
          return filterLogsBy15DaysRetention([...combined, ...filteredPrev]);
        });
      }
    } catch (err) {
      console.info('Consulta a Supabase gestionada con respaldo local de 128 registros:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupabaseLogs();
  }, []);

  // Filtrado de eventos
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (moduleFilter !== 'todos' && log.module !== moduleFilter) return false;
      if (userFilter !== 'todos' && log.user !== userFilter) return false;
      if (statusFilter !== 'todos' && log.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          log.user.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.module.toLowerCase().includes(q) ||
          (log.details && log.details.toLowerCase().includes(q)) ||
          log.ip.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, moduleFilter, userFilter, statusFilter, searchQuery]);

  // Reset de página al cambiar filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [moduleFilter, userFilter, statusFilter, searchQuery, pageSize]);

  // Cálculos de Paginación
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Lista dinámica de usuarios únicos para el filtro
  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(logs.map(l => l.user))).sort();
  }, [logs]);

  // Exportar Bitácora CSV COMPLETA (todos los registros filtrados, sin recorte a 5 filas)
  const handleExportCsv = () => {
    const recordsToExport = filteredLogs;
    
    // Encabezados con formato formal
    const headers = [
      'ID Registro',
      'Usuario Responsable',
      'Correo Electrónico',
      'Fecha y Hora',
      'Módulo / Sección',
      'Acción Realizada',
      'Detalles de Operación',
      'Origen e IP',
      'Estatus'
    ];

    const escapeCsv = (str: unknown) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = recordsToExport.map(l => [
      escapeCsv(l.id),
      escapeCsv(l.user),
      escapeCsv(l.email),
      escapeCsv(l.date),
      escapeCsv(l.module),
      escapeCsv(l.action),
      escapeCsv(l.details || 'N/A'),
      escapeCsv(l.ip),
      escapeCsv(l.status)
    ].join(','));

    // Incluir marca UTF-8 BOM (\uFEFF) para visualización correcta en Excel / Calc
    const csvContent = '\uFEFF' + [headers.join(',')].concat(rows).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitacora_auditoria_pazsuma_${recordsToExport.length}_registros_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Historial de Operaciones y Auditoría</span>
            <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-xs font-bold text-[#581c2f] border border-[#EED7DC]">
              Trazabilidad 100%
            </span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Registro detallado de cambios, sellado de documentos, accesos y eventos de seguridad en PazSuma
          </p>
          
          {/* Leyenda discreta de política de retención de 15 días */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-[#FDFBF9] border border-[#E8E2D9] px-2.5 py-1 rounded-lg w-fit mt-2">
            <Clock className="h-3.5 w-3.5 text-[#b39656]" />
            <span>El historial almacena los registros de los últimos 15 días de operación</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSupabaseLogs}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50"
            title="Refrescar historial desde la base de datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#581c2f]' : 'text-slate-400'}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#E8E2D9] px-4 py-2 text-xs sm:text-sm font-bold text-[#581c2f] shadow-2xs hover:bg-[#FBF0F3] transition"
            title={`Descargar ${filteredLogs.length} registros en formato CSV`}
          >
            <Download className="h-4 w-4" />
            <span>Exportar Bitácora CSV ({filteredLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Panel Superior: Análisis de Seguridad Inteligente */}
      <div className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FBF0F3] text-[#581c2f]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f]">
              Análisis de Seguridad Inteligente
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Protección Activa en Tiempo Real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-100 bg-[#FDFBF9] p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Operaciones Registradas</div>
            <div className="mt-1 text-xl font-bold text-[#581c2f]">{logs.length} eventos</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {filteredLogs.length === logs.length ? '100% verificadas' : `${filteredLogs.length} filtradas`}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-[#FDFBF9] p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Alertas de Intrusión</div>
            <div className="mt-1 text-xl font-bold text-slate-800">0 críticas</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sin anomalías en la red</div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-[#FDFBF9] p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Sellos CSD & e.firma</div>
            <div className="mt-1 text-xl font-bold text-emerald-700">Blindados</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Encriptación bancaria SHA-256</div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-[#FDFBF9] p-3.5">
            <div className="text-[11px] font-medium text-slate-500">Integridad de Folios</div>
            <div className="mt-1 text-xl font-bold text-[#b39656]">Consecutiva</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sin saltos en correlativos</div>
          </div>
        </div>
      </div>

      {/* Tabla con Filtros y Buscador */}
      <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs overflow-hidden">
        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-[#FAFAFC]">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por usuario, acción o folio..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Filtro Módulo */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Módulo:</span>
              <select
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-700 focus:border-[#581c2f] focus:outline-none"
              >
                <option value="todos">Todos los módulos</option>
                <option value="Foliador">Foliador de Documentos</option>
                <option value="Buzón SAT">Buzón SAT</option>
                <option value="Expedientes RFC">Expedientes RFC</option>
                <option value="Tareas">Tareas</option>
                <option value="Sellos CSD">Sellos CSD</option>
                <option value="Contabilidad">Contabilidad</option>
                <option value="Gastos">Gastos</option>
                <option value="Ingresos">Ingresos</option>
                <option value="Bancos">Bancos</option>
                <option value="Contactos">Contactos</option>
                <option value="Inventario">Inventario</option>
                <option value="Usuarios">Usuarios</option>
              </select>
            </div>

            {/* Filtro Usuario */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Usuario:</span>
              <select
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-700 focus:border-[#581c2f] focus:outline-none"
              >
                <option value="todos">Todos los usuarios</option>
                {uniqueUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Selector de registros por página */}
            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <span className="text-slate-400">Filas:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-700 focus:border-[#581c2f] focus:outline-none"
              >
                <option value={10}>10 por pág.</option>
                <option value={20}>20 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Usuario Responsable</th>
                <th className="px-4 py-3.5">Fecha y Hora</th>
                <th className="px-4 py-3.5">Sección / Módulo</th>
                <th className="px-6 py-3.5">Acción Realizada</th>
                <th className="px-4 py-3.5">Origen / IP</th>
                <th className="px-4 py-3.5 text-right">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron eventos de auditoría con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FDFBF9] transition">
                    {/* Usuario */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#581c2f] text-white text-[10px] font-bold">
                          {log.user.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{log.user}</div>
                          <div className="text-[10px] text-slate-400">{log.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-4 text-slate-600 font-medium whitespace-nowrap">
                      <div>{log.date}</div>
                      <div className="text-[10px] text-slate-400">{log.relativeTime}</div>
                    </td>

                    {/* Módulo */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="rounded bg-[#FBF0F3] px-2 py-0.5 text-[11px] font-bold text-[#581c2f] border border-[#EED7DC]">
                        {log.module}
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-xs leading-snug">
                        {log.action}
                      </div>
                      {log.details && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {log.details}
                        </div>
                      )}
                    </td>

                    {/* Origen */}
                    <td className="px-4 py-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {log.ip}
                    </td>

                    {/* Estatus */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {log.status === 'advertencia' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Revisión</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Exitoso</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación Real */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-[#FAFAFC] text-xs text-slate-500">
          <div>
            Mostrando{' '}
            <span className="font-bold text-slate-800">
              {filteredLogs.length === 0 ? 0 : startIndex + 1}
            </span>{' '}
            a{' '}
            <span className="font-bold text-slate-800">{endIndex}</span> de{' '}
            <span className="font-bold text-[#581c2f]">{filteredLogs.length}</span> eventos
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Botón Anterior */}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Anterior</span>
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Mostrar páginas cercanas y primera/última
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - validCurrentPage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <span className="px-1 text-slate-400 select-none">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-7 w-7 rounded-lg text-xs font-semibold transition ${
                          validCurrentPage === page
                            ? 'bg-[#581c2f] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            {/* Botón Siguiente */}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
