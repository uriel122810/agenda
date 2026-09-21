'use client';

import React, { useState } from 'react';
import {
  Home, Inbox, CheckSquare, Users, Settings, BarChart2,
  Receipt, ArrowDownCircle, ArrowUpCircle, Package, Landmark,
  Calculator, Flag, Sparkles, ChevronDown, ChevronRight,
  Stamp, HelpCircle, ExternalLink, Gift, Store, Globe,
  TrendingUp, X, ChevronLeft, ShieldCheck, Mail
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
  | 'contabilidad'
  | 'reportes'
  | 'configuracion';

interface AlegraSidebarProps {
  currentTab: AlegraTabId;
  onSelectTab: (tab: AlegraTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenPromo?: () => void;
  userEmail?: string;
  userName?: string;
}

export default function AlegraSidebar({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenPromo,
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
      className={`h-screen flex flex-col bg-[#F8FAFC] border-r border-slate-200 text-slate-700 select-none transition-all duration-300 z-30 flex-shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* ── Logo & Header ──────────────────────────────────────────────── */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            {/* Alegra Teal Origami Logo Icon */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00C9A7] to-[#00A88B] flex items-center justify-center text-white shadow-sm shadow-[#00C9A7]/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-sans">
                alegra
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C9A7]"></span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00C9A7] to-[#00A88B] flex items-center justify-center text-white shadow-sm shadow-[#00C9A7]/30">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* ── Volver a Espacio Contador ──────────────────────────────────── */}
      {!isCollapsed && (
        <div className="px-4 pt-3 pb-1">
          <button
            onClick={() => onSelectTab('espacio_trabajo')}
            className="w-full text-left flex items-center gap-1.5 text-xs font-bold text-[#00A88B] hover:text-[#008970] transition-colors py-1 px-1 rounded"
          >
            <span>&lt;</span>
            <span>Volver a Espacio Contador</span>
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
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Home size={18} className={isTabActive('inicio') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Inicio</span>}
        </button>

        {/* Configuración inicial / Onboarding */}
        <button
          onClick={() => onSelectTab('configuracion_inicial')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('configuracion_inicial')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Flag size={18} className={isTabActive('configuracion_inicial') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span className="truncate">Configuración inicial</span>}
        </button>

        {/* Buzón SAT (Beta) */}
        <button
          onClick={() => onSelectTab('buzon_sat')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group ${
            isTabActive('buzon_sat')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Mail size={18} className={isTabActive('buzon_sat') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span>Buzón SAT</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 tracking-wider">
                Beta
              </span>
            </div>
          )}
        </button>

        {/* SECTION: Espacio de Trabajo */}
        {!isCollapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Espacio de trabajo
            </span>
          </div>
        )}

        {/* Espacio de trabajo (Clientes / RFCs) */}
        <button
          onClick={() => onSelectTab('espacio_trabajo')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('espacio_trabajo')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Store size={18} className={isTabActive('espacio_trabajo') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Espacio Contador / RFCs</span>}
        </button>

        {/* Mi equipo */}
        <button
          onClick={() => onSelectTab('mi_equipo')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('mi_equipo')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Users size={18} className={isTabActive('mi_equipo') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Mi equipo</span>}
        </button>

        {/* Gestión de tareas */}
        <button
          onClick={() => onSelectTab('tareas')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('tareas')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <CheckSquare size={18} className={isTabActive('tareas') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Gestión de tareas</span>}
        </button>

        {/* Foliador de Documentos */}
        <button
          onClick={() => onSelectTab('foliador')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('foliador')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Stamp size={18} className={isTabActive('foliador') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span>Foliador Oficial</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                PDF
              </span>
            </div>
          )}
        </button>

        {/* SECTION: Administración */}
        {!isCollapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Administración
            </span>
          </div>
        )}

        {/* Ingresos (Expandable) */}
        <div>
          <button
            onClick={() => onSelectTab('ingresos')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
              isTabActive('ingresos')
                ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowDownCircle size={18} className={isTabActive('ingresos') ? 'text-[#00C9A7]' : 'text-slate-500'} />
              {!isCollapsed && <span>Ingresos</span>}
            </div>
            {!isCollapsed && (
              <span onClick={e => toggleSubmenu('ingresos', e)} className="p-0.5 hover:text-slate-900">
                {expandedMenus.ingresos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </button>
          {!isCollapsed && expandedMenus.ingresos && (
            <div className="pl-9 pr-2 py-1 space-y-1 text-xs text-slate-500 border-l border-slate-200 ml-5 my-1">
              <p className="py-1 hover:text-[#00C9A7] cursor-pointer">Facturas de venta</p>
              <p className="py-1 hover:text-[#00C9A7] cursor-pointer">Pagos recibidos</p>
              <p className="py-1 hover:text-[#00C9A7] cursor-pointer">Cotizaciones</p>
            </div>
          )}
        </div>

        {/* Gastos (Expandable) */}
        <div>
          <button
            onClick={() => onSelectTab('gastos')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all ${
              isTabActive('gastos')
                ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowUpCircle size={18} className={isTabActive('gastos') ? 'text-[#00C9A7]' : 'text-slate-500'} />
              {!isCollapsed && <span>Gastos</span>}
            </div>
            {!isCollapsed && (
              <span onClick={e => toggleSubmenu('gastos', e)} className="p-0.5 hover:text-slate-900">
                {expandedMenus.gastos ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
          </button>
          {!isCollapsed && expandedMenus.gastos && (
            <div className="pl-9 pr-2 py-1 space-y-1 text-xs text-slate-500 border-l border-slate-200 ml-5 my-1">
              <p className="py-1 hover:text-[#00C9A7] cursor-pointer">Facturas de proveedores</p>
              <p className="py-1 hover:text-[#00C9A7] cursor-pointer">Pagos a compras</p>
            </div>
          )}
        </div>

        {/* Contactos */}
        <button
          onClick={() => onSelectTab('contactos')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('contactos')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Users size={18} className={isTabActive('contactos') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Contactos</span>}
        </button>

        {/* Inventario */}
        <button
          onClick={() => onSelectTab('inventario')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('inventario')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Package size={18} className={isTabActive('inventario') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Inventario</span>}
        </button>

        {/* Bancos */}
        <button
          onClick={() => onSelectTab('bancos')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('bancos')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Landmark size={18} className={isTabActive('bancos') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Bancos</span>}
        </button>

        {/* Contabilidad */}
        <button
          onClick={() => onSelectTab('contabilidad')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('contabilidad')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Calculator size={18} className={isTabActive('contabilidad') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Contabilidad</span>}
        </button>

        {/* Reportes */}
        <button
          onClick={() => onSelectTab('reportes')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('reportes')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <BarChart2 size={18} className={isTabActive('reportes') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Reportes</span>}
        </button>

        {/* Configuración */}
        <button
          onClick={() => onSelectTab('configuracion')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
            isTabActive('configuracion')
              ? 'bg-white text-slate-900 font-bold shadow-sm border border-slate-200/70 border-l-4 border-l-[#00C9A7]'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Settings size={18} className={isTabActive('configuracion') ? 'text-[#00C9A7]' : 'text-slate-500'} />
          {!isCollapsed && <span>Configuración</span>}
        </button>

        {/* SECTION: Descubre más soluciones */}
        {!isCollapsed && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Descubre más soluciones
            </span>
          </div>
        )}

        {!isCollapsed && (
          <>
            <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-slate-200/40">
              <Store size={16} />
              <span>POS Punto de Venta</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-slate-200/40">
              <Globe size={16} />
              <span>Portal de clientes</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-slate-900 cursor-pointer rounded-lg hover:bg-slate-200/40">
              <TrendingUp size={16} />
              <span>Alegra Ventas</span>
            </div>
          </>
        )}
      </nav>

      {/* ── Bottom Promo Card (Matching Screenshot 3 & 4) ──────────────── */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200 bg-[#F8FAFC]">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#E6FAF6] flex items-center justify-center text-[#00C9A7] flex-shrink-0 mt-0.5">
                <Gift size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  ¡Alegra te da tiempo extra para que tu negocio nunca pare!
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Paga 9 meses, recibe 12.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenPromo}
              className="w-full mt-3 bg-[#00C9A7] hover:bg-[#00B796] text-white py-2 px-3 rounded-xl font-bold text-xs transition-colors shadow-sm shadow-[#00C9A7]/20 flex items-center justify-center gap-1 cursor-pointer"
            >
              Obtén tu promo ahora
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
