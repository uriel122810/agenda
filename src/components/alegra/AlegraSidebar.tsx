'use client';

import React, { useState } from 'react';
import {
  Home, Inbox, CheckSquare, Users, Settings, BarChart2,
  Receipt, ArrowDownCircle, ArrowUpCircle, Package, Landmark,
  Calculator, Flag, Sparkles, ChevronDown, ChevronRight,
  Stamp, HelpCircle, ExternalLink, Gift, Store, Globe,
  TrendingUp, X, ChevronLeft, ShieldCheck, Mail, FileText, ArrowLeftRight
} from 'lucide-react';

export type AlegraTabId =
  | 'inicio'
  | 'configuracion_inicial'
  | 'buzon_sat'
  | 'espacio_trabajo'
  | 'mi_equipo'
  | 'tareas'
  | 'foliador'
  | 'ingresos'
  | 'gastos'
  | 'contactos'
  | 'inventario'
  | 'bancos'
  | 'conciliacion'
  | 'contabilidad'
  | 'reportes'
  | 'historial'
  | 'configuracion';

interface AlegraSidebarProps {
  currentTab: AlegraTabId;
  onSelectTab: (tab: AlegraTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userEmail?: string;
  userName?: string;
}

export default function AlegraSidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  userEmail,
  userName
}: AlegraSidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    ingresos: false,
    gastos: false,
    inventario: false,
    bancos: false,
    contabilidad: false
  });

  const toggleSubmenu = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isTabActive = (id: AlegraTabId) => currentTab === id;

  return (
    <aside
      className={`h-screen flex flex-col bg-[#FDFBF9] border-r border-[#E8E2D9] text-slate-700 select-none transition-all duration-300 z-30 flex-shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ── Logo & Header PazSuma ────────────────────────────────────────── */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#E8E2D9] bg-white">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            {/* Isotipo PazSuma en tono Guinda / Dorado */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#581c2f] to-[#3b1220] flex items-center justify-center text-white shadow-sm shadow-[#581c2f]/20">
              <span className="font-serif font-black text-lg tracking-tighter text-[#F4F1EA]">P</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-xl tracking-tight text-[#581c2f] font-sans">
                Paz<span className="text-[#b39656]">Suma</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#b39656]"></span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#581c2f] to-[#3b1220] flex items-center justify-center text-white shadow-sm shadow-[#581c2f]/20">
              <span className="font-serif font-black text-lg tracking-tighter text-[#F4F1EA]">P</span>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-[#581c2f] hover:bg-[#FBF0F3] transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* ── Volver a Espacio Institucional ───────────────────────────────── */}
      {!isCollapsed && (
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => onSelectTab('espacio_trabajo')}
            className="w-full text-left flex items-center gap-1.5 text-xs font-bold text-[#581c2f] hover:text-[#72223c] transition-colors py-1 px-1 rounded"
          >
            <span>&lt;</span>
            <span>Volver a Espacio Institucional</span>
          </button>
        </div>
      )}

      {/* ── Menu List (Scrollable) ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 custom-scrollbar text-[13px]">
        {/* Inicio */}
        <button
          onClick={() => onSelectTab('inicio')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('inicio')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Home size={18} className={isTabActive('inicio') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Inicio</span>}
        </button>

        {/* Configuración inicial / Onboarding */}
        <button
          onClick={() => onSelectTab('configuracion_inicial')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('configuracion_inicial')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Flag size={18} className={isTabActive('configuracion_inicial') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Configuración inicial</span>}
        </button>

        {/* Buzón SAT */}
        <button
          onClick={() => onSelectTab('buzon_sat')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('buzon_sat')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Inbox size={18} className={isTabActive('buzon_sat') ? 'text-[#581c2f]' : 'text-slate-400'} />
            {!isCollapsed && <span>Buzón SAT</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FBF0F3] text-[#581c2f] border border-[#EED7DC]">
              Beta
            </span>
          )}
        </button>

        {/* Separador sutil */}
        <div className="my-2 border-t border-[#E8E2D9]/60" />

        {/* Espacio de trabajo */}
        <button
          onClick={() => onSelectTab('espacio_trabajo')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('espacio_trabajo')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Receipt size={18} className={isTabActive('espacio_trabajo') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Espacio de trabajo</span>}
        </button>

        {/* Mi equipo */}
        <button
          onClick={() => onSelectTab('mi_equipo')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('mi_equipo')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Users size={18} className={isTabActive('mi_equipo') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Mi equipo</span>}
        </button>

        {/* Gestión de tareas */}
        <button
          onClick={() => onSelectTab('tareas')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('tareas')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <CheckSquare size={18} className={isTabActive('tareas') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Gestión de tareas</span>}
        </button>

        {/* Foliador Oficial de Documentos */}
        <button
          onClick={() => onSelectTab('foliador')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('foliador')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <div className="flex items-center gap-3">
            <Stamp size={18} className={isTabActive('foliador') ? 'text-[#581c2f]' : 'text-[#b39656]'} />
            {!isCollapsed && <span>Foliador de Documentos</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F4F1EA] text-[#b39656] border border-[#E8E2D9]">
              Oficial
            </span>
          )}
        </button>

        {/* Separador */}
        <div className="my-2 border-t border-[#E8E2D9]/60" />

        {/* Ingresos (desplegable) */}
        <div>
          <button
            onClick={() => onSelectTab('ingresos')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
              isTabActive('ingresos')
                ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
                : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowDownCircle size={18} className={isTabActive('ingresos') ? 'text-[#581c2f]' : 'text-slate-400'} />
              {!isCollapsed && <span>Ingresos</span>}
            </div>
            {!isCollapsed && (
              <span onClick={e => toggleSubmenu('ingresos', e)} className="p-1 hover:text-slate-900">
                {expandedMenus.ingresos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </button>
          {!isCollapsed && expandedMenus.ingresos && (
            <div className="pl-9 pr-2 py-1 space-y-1 text-xs text-slate-500">
              <div onClick={() => onSelectTab('ingresos')} className="py-1 px-2 hover:text-[#581c2f] cursor-pointer rounded">Facturas de venta</div>
              <div onClick={() => onSelectTab('ingresos')} className="py-1 px-2 hover:text-[#581c2f] cursor-pointer rounded">Pagos recibidos</div>
            </div>
          )}
        </div>

        {/* Gastos (desplegable) */}
        <div>
          <button
            onClick={() => onSelectTab('gastos')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
              isTabActive('gastos')
                ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
                : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowUpCircle size={18} className={isTabActive('gastos') ? 'text-[#581c2f]' : 'text-slate-400'} />
              {!isCollapsed && <span>Gastos</span>}
            </div>
            {!isCollapsed && (
              <span onClick={e => toggleSubmenu('gastos', e)} className="p-1 hover:text-slate-900">
                {expandedMenus.gastos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </button>
        </div>

        {/* Contactos */}
        <button
          onClick={() => onSelectTab('contactos')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('contactos')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Users size={18} className={isTabActive('contactos') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Contactos</span>}
        </button>

        {/* Inventario */}
        <button
          onClick={() => onSelectTab('inventario')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('inventario')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Package size={18} className={isTabActive('inventario') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Inventario</span>}
        </button>

        {/* Bancos */}
        <button
          onClick={() => onSelectTab('bancos')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('bancos')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Landmark size={18} className={isTabActive('bancos') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Bancos</span>}
        </button>

        {/* Conciliación bancaria */}
        <button
          onClick={() => onSelectTab('conciliacion')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('conciliacion')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <ArrowLeftRight size={18} className={isTabActive('conciliacion') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Conciliación bancaria</span>}
        </button>

        {/* Contabilidad */}
        <button
          onClick={() => onSelectTab('contabilidad')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('contabilidad')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Calculator size={18} className={isTabActive('contabilidad') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Contabilidad</span>}
        </button>

        {/* Reportes */}
        <button
          onClick={() => onSelectTab('reportes')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('reportes')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <BarChart2 size={18} className={isTabActive('reportes') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Reportes</span>}
        </button>

        {/* Historial de Operaciones (Auditoría) */}
        <button
          onClick={() => onSelectTab('historial')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('historial')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <ShieldCheck size={18} className={isTabActive('historial') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Historial de operaciones</span>}
        </button>

        {/* Configuración */}
        <button
          onClick={() => onSelectTab('configuracion')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-all ${
            isTabActive('configuracion')
              ? 'bg-white text-[#581c2f] font-bold shadow-xs border-l-4 border-[#581c2f]'
              : 'text-slate-600 hover:bg-[#FBF0F3]/60 hover:text-[#581c2f]'
          }`}
        >
          <Settings size={18} className={isTabActive('configuracion') ? 'text-[#581c2f]' : 'text-slate-400'} />
          {!isCollapsed && <span>Configuración</span>}
        </button>
      </nav>

      {/* ── Pie de barra lateral institucional (SIN PUBLICIDAD) ─────────── */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#E8E2D9] bg-white">
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-slate-700">Sistema Activo</span>
            </div>
            <span className="text-[10px] text-slate-400">PazSuma v2.4</span>
          </div>
        </div>
      )}
    </aside>
  );
}
