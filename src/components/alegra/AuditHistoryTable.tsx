'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Search, Filter, Calendar, Download, RefreshCw,
  User, Clock, AlertTriangle, CheckCircle2, Lock, Eye,
  ArrowUpDown, Sparkles, FileText, ChevronDown, Laptop
} from 'lucide-react';

interface AuditLog {
  id: string;
  user: string;
  email: string;
  date: string;
  relativeTime: string;
  module: 'Foliador' | 'Buzón SAT' | 'Expedientes RFC' | 'Tareas' | 'Sellos CSD' | 'Usuarios';
  action: string;
  details?: string;
  ip: string;
  status: 'completado' | 'advertencia' | 'critico';
}

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

  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      user: 'Uriel Gómez',
      email: 'uriel@pazsuma.com',
      date: '20 Sep 2026, 23:18:44',
      relativeTime: 'Hace unos minutos',
      module: 'Foliador',
      action: 'Se estampó folio oficial OFI-2026-0042 con logotipo institucional',
      details: 'Archivo: oficio_presidencia_v2.pdf (4 páginas foliadas)',
      ip: '189.240.12.94 • CDMX',
      status: 'completado'
    },
    {
      id: 'log-2',
      user: 'Ana Martínez',
      email: 'ana.martinez@pazsuma.com',
      date: '20 Sep 2026, 22:45:10',
      relativeTime: 'Hace 35 min',
      module: 'Buzón SAT',
      action: 'Sincronización masiva de opiniones de cumplimiento 32-D',
      details: '38 opiniones positivas confirmadas por el SAT',
      ip: '189.240.12.94 • CDMX',
      status: 'completado'
    },
    {
      id: 'log-3',
      user: 'Uriel Gómez',
      email: 'uriel@pazsuma.com',
      date: '20 Sep 2026, 21:12:00',
      relativeTime: 'Hace 2 horas',
      module: 'Sellos CSD',
      action: 'Validación de certificado de sello digital .cer y .key',
      details: 'Vigencia verificada hasta Octubre 2028',
      ip: '189.240.12.94 • CDMX',
      status: 'completado'
    },
    {
      id: 'log-4',
      user: 'Carlos Ruiz',
      email: 'carlos.ruiz@pazsuma.com',
      date: '20 Sep 2026, 19:30:15',
      relativeTime: 'Hace 4 horas',
      module: 'Tareas',
      action: 'Se movió tarea "Declaración Mensual" a columna En Proceso',
      details: 'Asignado a: Carlos Ruiz Solís',
      ip: '187.189.44.11 • Guadalajara',
      status: 'completado'
    },
    {
      id: 'log-5',
      user: 'Sistema Automático',
      email: 'sistema@pazsuma.com',
      date: '20 Sep 2026, 18:00:00',
      relativeTime: 'Hace 5 horas',
      module: 'Expedientes RFC',
      action: 'Extracción inteligente de Constancia CSF con IA',
      details: 'RFC: IND980512KL3 validado contra lista negra 69-B',
      ip: 'Servidor Seguro • AWS us-east-1',
      status: 'completado'
    }
  ]);

  const filteredLogs = logs.filter(log => {
    if (moduleFilter !== 'todos' && log.module !== moduleFilter) return false;
    if (userFilter !== 'todos' && log.user !== userFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Usuario,Correo,Fecha,Modulo,Accion,IP']
        .concat(
          filteredLogs.map(
            l => `"${l.user}","${l.email}","${l.date}","${l.module}","${l.action}","${l.ip}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_pazsuma_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#E8E2D9] px-4 py-2 text-xs sm:text-sm font-bold text-[#581c2f] shadow-2xs hover:bg-[#FBF0F3] transition"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Bitácora CSV</span>
        </button>
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
            <div className="text-[11px] font-medium text-slate-500">Operaciones Hoy</div>
            <div className="mt-1 text-xl font-bold text-[#581c2f]">128 eventos</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Todas verificadas</div>
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

          <div className="flex items-center gap-2.5 text-xs">
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
                <option value="todos">Todos</option>
                <option value="Uriel Gómez">Uriel Gómez</option>
                <option value="Ana Martínez">Ana Martínez</option>
                <option value="Carlos Ruiz">Carlos Ruiz</option>
                <option value="Sistema Automático">Sistema Automático</option>
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
              {filteredLogs.map(log => (
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
                  <td className="px-4 py-4 text-slate-600 font-medium">
                    <div>{log.date}</div>
                    <div className="text-[10px] text-slate-400">{log.relativeTime}</div>
                  </td>

                  {/* Módulo */}
                  <td className="px-4 py-4">
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
                  <td className="px-4 py-4 text-slate-500 font-mono text-[11px]">
                    {log.ip}
                  </td>

                  {/* Estatus */}
                  <td className="px-4 py-4 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Exitoso</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
