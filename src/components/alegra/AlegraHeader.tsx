'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Plus, HelpCircle, Bell, Grid, ChevronDown,
  User, LogOut, Check, Building2, Shield, Settings,
  Sparkles, ExternalLink
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
  userEmail = 'usuario@alegra.com',
  userName = 'Espacio Contador',
  onLogout,
  activeWorkspace = 'Espacio Contador',
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
    { id: 'espacio_contador', name: 'Espacio Contador', subtitle: 'Tu espacio principal', tag: 'Principal' },
    { id: 'conta_fiscal', name: 'conta', subtitle: 'Despacho Contable SC', tag: 'Activo' },
    { id: 'grupo_demo', name: 'Empresa Demo SA de CV', subtitle: 'RFC: XAXX010101000', tag: 'Cliente' }
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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Buscador global centrado (estilo Alegra exacto) */}
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
            placeholder="Buscar"
            className="w-full rounded-md border border-slate-200 bg-[#F8FAFC] py-1.5 pl-9 pr-8 text-sm text-slate-700 placeholder-slate-400 transition focus:border-[#00C9A7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
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

      {/* Botón rápido (+) estilo Alegra exacto */}
      <div className="ml-3 flex items-center">
        <button
          type="button"
          onClick={onOpenQuickCreate}
          title="Crear nuevo registro rápido"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-[#00C9A7] hover:bg-[#E6FAF6] hover:text-[#00C9A7]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Herramientas de la derecha: Ayuda, Apps, Selector Workspace, Perfil */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {/* Ayuda */}
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Centro de ayuda y soporte"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          {isHelpOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ayuda y Soporte</h4>
              <ul className="space-y-1 text-sm text-slate-700">
                <li>
                  <a href="#soporte" className="flex items-center justify-between rounded-lg p-2 hover:bg-[#E6FAF6] hover:text-[#00A88B] transition">
                    <span>Centro de ayuda Alegra</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                </li>
                <li>
                  <a href="#sat" className="flex items-center justify-between rounded-lg p-2 hover:bg-[#E6FAF6] hover:text-[#00A88B] transition">
                    <span>Guía de Buzón SAT y e.firma</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                  </a>
                </li>
                <li>
                  <button 
                    onClick={() => { setIsHelpOpen(false); onSelectTab('foliador'); }}
                    className="w-full text-left flex items-center justify-between rounded-lg p-2 hover:bg-[#E6FAF6] hover:text-[#00A88B] transition"
                  >
                    <span>Foliador de Documentos</span>
                    <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">Nuevo</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Notificaciones / Mensajes */}
        <button
          type="button"
          onClick={() => onSelectTab('buzon_sat')}
          className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
          title="Bandeja de notificaciones y SAT"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C9A7] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C9A7]"></span>
          </span>
        </button>

        {/* Apps Grid */}
        <div className="relative" ref={appsRef}>
          <button
            type="button"
            onClick={() => setIsAppsMenuOpen(!isAppsMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            title="Ecosistema Alegra"
          >
            <Grid className="h-4 w-4" />
          </button>

          {isAppsMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Soluciones Alegra</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => { setIsAppsMenuOpen(false); onSelectTab('inicio'); }} 
                  className="flex flex-col items-start p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition"
                >
                  <span className="font-semibold text-slate-800">Contabilidad</span>
                  <span className="text-[11px] text-slate-500">Gestión contable y CFDI</span>
                </button>
                <button 
                  onClick={() => { setIsAppsMenuOpen(false); onSelectTab('buzon_sat'); }}
                  className="flex flex-col items-start p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition"
                >
                  <span className="font-semibold text-slate-800">Buzón SAT</span>
                  <span className="text-[11px] text-slate-500">Descargas automáticas</span>
                </button>
                <button 
                  onClick={() => { setIsAppsMenuOpen(false); onSelectTab('tareas'); }}
                  className="flex flex-col items-start p-2 rounded-xl hover:bg-slate-50 border border-slate-100 transition"
                >
                  <span className="font-semibold text-slate-800">Tareas & Kanban</span>
                  <span className="text-[11px] text-slate-500">Gestión de despacho</span>
                </button>
                <button 
                  onClick={() => { setIsAppsMenuOpen(false); onSelectTab('foliador'); }}
                  className="flex flex-col items-start p-2 rounded-xl bg-teal-50/60 hover:bg-teal-50 border border-teal-100 transition"
                >
                  <span className="font-semibold text-teal-800">Foliador</span>
                  <span className="text-[11px] text-teal-600">Estampado de PDFs</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separador vertical */}
        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Selector de espacio de trabajo/empresa activa a la derecha (estilo screenshot Alegra: 'Espacio Contador / Tu espacio') */}
        <div className="relative" ref={workspaceRef}>
          <button
            type="button"
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-left text-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#E6FAF6] text-[#00C9A7]">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="hidden text-left md:block">
              <div className="font-semibold text-slate-800 leading-tight max-w-[130px] truncate">{activeWorkspace}</div>
              <div className="text-[10px] text-slate-400 leading-tight">Tu espacio</div>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
          </button>

          {isWorkspaceMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Cambiar de Empresa / Espacio
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
                        isSelected ? 'bg-[#E6FAF6] text-[#00A88B] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-6 w-6 items-center justify-center rounded ${isSelected ? 'bg-[#00C9A7] text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{ws.name}</p>
                          <p className="text-[10px] text-slate-400">{ws.subtitle}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#00C9A7]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 border-t border-slate-100 pt-2">
                <button
                  onClick={() => {
                    setIsWorkspaceMenuOpen(false);
                    onSelectTab('espacio_trabajo');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-[#00A88B] font-semibold hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Añadir nuevo RFC / Empresa</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Perfil de usuario (círculo lila 'U' como en el screenshot) */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDE9FE] font-bold text-xs text-[#7C3AED] ring-2 ring-transparent transition hover:ring-[#C4B5FD]"
            title={userEmail}
          >
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
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
                  <span>Configuración de cuenta</span>
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
