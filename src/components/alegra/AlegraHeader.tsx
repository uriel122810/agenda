'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Plus, HelpCircle, Bell, Grid, ChevronDown,
  User, LogOut, Check, Building2, Shield, Settings,
  Sparkles, ExternalLink, Stamp
} from 'lucide-react';
import { AlegraTabId } from './AlegraSidebar';

interface AlegraHeaderProps {
  onOpenQuickCreate: () => void;
  onSelectTab: (tab: AlegraTabId) => void;
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  activeWorkspace?: string;
  onWorkspaceChange?: (workspace: string) => void;
  onSearch?: (query: string) => void;
}

export default function AlegraHeader({
  onOpenQuickCreate,
  onSelectTab,
  userEmail = 'uriel@pazsuma.com',
  userName = 'Espacio PazSuma',
  onLogout,
  activeWorkspace = 'Espacio Central PazSuma',
  onWorkspaceChange,
  onSearch
}: AlegraHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const workspaces = [
    { id: 'pazsuma_central', name: 'Espacio Central PazSuma', subtitle: 'Dirección General y Despacho', tag: 'Principal' },
    { id: 'pazsuma_fiscal', name: 'Módulo Fiscal y SAT', subtitle: 'Control de Obligaciones y Sellos CSD', tag: 'Activo' },
    { id: 'pazsuma_gestion', name: 'Gestión Documental y Folios', subtitle: 'Oficios, Actas y Libros Oficiales', tag: 'Institucional' }
  ];

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target as Node)) {
        setIsAppsMenuOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#E8E2D9] bg-white px-4 sm:px-6 shadow-[0_1px_2px_rgba(88,28,47,0.03)]">
      {/* Buscador global centrado */}
      <div className="flex flex-1 max-w-xl items-center">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar folios, clientes, RFC o documentos en PazSuma..."
            className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] py-1.5 pl-9 pr-8 text-sm text-slate-800 placeholder-slate-400 transition focus:border-[#581c2f] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                if (onSearch) onSearch('');
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Botón rápido (+) estilo PazSuma en tono vino */}
      <div className="ml-3 flex items-center">
        <button
          type="button"
          onClick={onOpenQuickCreate}
          title="Creación rápida (Tarea, Folio, RFC)"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E2D9] bg-white text-slate-600 shadow-2xs transition hover:border-[#581c2f] hover:bg-[#FBF0F3] hover:text-[#581c2f]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Herramientas de la derecha */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Foliador rápido */}
        <button
          type="button"
          onClick={() => onSelectTab('foliador')}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#E8E2D9] bg-[#FDFBF9] px-2.5 py-1 text-xs font-semibold text-[#581c2f] hover:bg-[#FBF0F3] transition"
          title="Abrir Foliador Oficial"
        >
          <Stamp className="h-3.5 w-3.5 text-[#b39656]" />
          <span>Foliador</span>
        </button>

        {/* Ayuda */}
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Centro de ayuda PazSuma"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {isHelpOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#581c2f] mb-2">Ayuda y Documentación</h4>
              <ul className="space-y-1 text-sm text-slate-700">
                <li>
                  <button 
                    onClick={() => { setIsHelpOpen(false); onSelectTab('foliador'); }}
                    className="w-full text-left flex items-center justify-between rounded-lg p-2 hover:bg-[#FBF0F3] hover:text-[#581c2f] transition"
                  >
                    <span>Guía del Foliador Digital</span>
                    <span className="rounded bg-[#F4F1EA] px-1.5 py-0.5 text-[10px] font-semibold text-[#b39656]">Oficial</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => { setIsHelpOpen(false); onSelectTab('buzon_sat'); }}
                    className="w-full text-left flex items-center justify-between rounded-lg p-2 hover:bg-[#FBF0F3] hover:text-[#581c2f] transition"
                  >
                    <span>Sincronización Buzón SAT</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <button
          type="button"
          onClick={() => onSelectTab('buzon_sat')}
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Notificaciones institucionales y SAT"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#581c2f] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#581c2f]"></span>
          </span>
        </button>

        {/* Separador vertical */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Selector de espacio de trabajo / departamento institucional */}
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-[#E8E2D9] bg-[#FDFBF9] px-2.5 py-1 text-left text-xs transition hover:border-slate-300 hover:bg-white"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#FBF0F3] text-[#581c2f]">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="hidden text-left md:block">
              <div className="font-semibold text-slate-800 leading-tight max-w-[150px] truncate">{activeWorkspace}</div>
              <div className="text-[10px] text-slate-400 leading-tight">PazSuma Institucional</div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
          </button>

          {isWorkspaceMenuOpen && (
            <div className="absolute right-0 mt-2 w-68 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Departamentos / Espacios
              </div>
              <div className="space-y-1">
                {workspaces.map(ws => {
                  const isSelected = ws.name === activeWorkspace;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        if (onWorkspaceChange) onWorkspaceChange(ws.name);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                        isSelected ? 'bg-[#FBF0F3] text-[#581c2f] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-6 w-6 items-center justify-center rounded ${isSelected ? 'bg-[#581c2f] text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{ws.name}</p>
                          <p className="text-[10px] text-slate-400">{ws.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#581c2f]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Perfil de usuario (círculo tono vino / dorado) */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#581c2f] font-bold text-xs text-white ring-2 ring-transparent transition hover:ring-[#b39656]/50"
            title={userEmail}
          >
            {userName ? userName.charAt(0).toUpperCase() : 'P'}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-semibold text-slate-800 truncate">{userName}</p>
                <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
              </div>
              <div className="py-1 text-xs text-slate-700">
                <button
                  onClick={() => { setIsUserMenuOpen(false); onSelectTab('configuracion'); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  <span>Configuración del sistema</span>
                </button>
                <button
                  onClick={() => { setIsUserMenuOpen(false); onSelectTab('mi_equipo'); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-50"
                >
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  <span>Usuarios y permisos</span>
                </button>
              </div>
              {onLogout && (
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => { setIsUserMenuOpen(false); onLogout(); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
