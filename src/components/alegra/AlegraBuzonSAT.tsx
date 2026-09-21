'use client';

import React, { useState } from 'react';
import {
  Mail, Inbox, Archive, Filter, ArrowUpDown, CheckCheck,
  Trash2, Users, Search, RefreshCw, AlertCircle, Clock,
  FileText, ShieldCheck, ChevronRight, Download
} from 'lucide-react';
import { generateBuzonNotificationPdf } from '@/lib/pdfReportGenerator';

interface BuzonMessage {
  id: string;
  rfc: string;
  razonSocial: string;
  title: string;
  type: 'comunicado' | 'notificacion' | 'requerimiento' | 'opinion';
  date: string;
  isRead: boolean;
  status: 'principal' | 'archivo';
}

export default function AlegraBuzonSAT() {
  const [activeTab, setActiveTab] = useState<'principal' | 'archivo'>('principal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [messages, setMessages] = useState<BuzonMessage[]>([
    {
      id: 'sat-1',
      rfc: 'XAXX010101000',
      razonSocial: 'Comercializadora Nacional SA de CV',
      title: 'Aviso de Actualización de Obligaciones Fiscales',
      type: 'comunicado',
      date: '20 Sep 2026, 10:14 AM',
      isRead: true,
      status: 'principal'
    },
    {
      id: 'sat-2',
      rfc: 'EADM910204AB1',
      razonSocial: 'Paula López Delgado',
      title: 'Opinión de Cumplimiento de Obligaciones Fiscales (32-D Positiva)',
      type: 'opinion',
      date: '18 Sep 2026, 16:30 PM',
      isRead: false,
      status: 'principal'
    }
  ]);

  const [filterType, setFilterType] = useState<string>('todos');

  // Filtrar según pestaña y búsqueda
  const currentMessages = messages.filter(m => {
    if (m.status !== activeTab) return false;
    if (filterType !== 'todos' && m.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.rfc.toLowerCase().includes(q) ||
        m.razonSocial.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedMessages.length === currentMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(currentMessages.map(m => m.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedMessages(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleArchiveSelected = () => {
    setMessages(prev =>
      prev.map(m =>
        selectedMessages.includes(m.id)
          ? { ...m, status: activeTab === 'principal' ? 'archivo' : 'principal' }
          : m
      )
    );
    setSelectedMessages([]);
  };

  const handleDeleteSelected = () => {
    setMessages(prev => prev.filter(m => !selectedMessages.includes(m.id)));
    setSelectedMessages([]);
  };

  const handleSimulateNewSatNotice = () => {
    const newNotice: BuzonMessage = {
      id: `sat-${Date.now()}`,
      rfc: 'PAZ980101XX1',
      razonSocial: 'PazSuma Gestión y Consultoría SC',
      title: 'Notificación de Validación de Declaración y Sellos CSD',
      type: 'notificacion',
      date: 'Hace un momento',
      isRead: false,
      status: 'principal'
    };
    setMessages(prev => [newNotice, ...prev]);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <span>Buzón SAT Oficial</span>
          <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-xs font-bold text-[#581c2f] border border-[#EED7DC]">
            Beta
          </span>
        </h1>

        <button
          onClick={handleSimulateNewSatNotice}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:border-[#581c2f] hover:text-[#581c2f] transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sincronizar avisos SAT</span>
        </button>
      </div>

      {/* Tarjeta principal con pestañas y barra de herramientas */}
      <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs overflow-hidden">
        {/* Pestañas: Principal | Archivo */}
        <div className="flex border-b border-[#E8E2D9] px-6 pt-2 bg-[#FDFBF9]">
          <button
            onClick={() => { setActiveTab('principal'); setSelectedMessages([]); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'principal'
                ? 'border-[#581c2f] text-[#581c2f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>Principal</span>
            <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 shadow-2xs">
              {messages.filter(m => m.status === 'principal').length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('archivo'); setSelectedMessages([]); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition ${
              activeTab === 'archivo'
                ? 'border-[#581c2f] text-[#581c2f]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Archive className="h-4 w-4" />
            <span>Archivo</span>
            <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 shadow-2xs">
              {messages.filter(m => m.status === 'archivo').length}
            </span>
          </button>
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#FAFAFC] px-6 py-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentMessages.length > 0 && selectedMessages.length === currentMessages.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-[#581c2f] focus:ring-[#581c2f]"
              />
            </label>

            {/* Filtrar */}
            <div className="relative flex items-center gap-1.5 cursor-pointer hover:text-slate-900">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Filtrar</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer"
              >
                <option value="todos">Todos los comunicados</option>
                <option value="comunicado">Comunicados</option>
                <option value="notificacion">Notificaciones</option>
                <option value="opinion">Opiniones de cumplimiento</option>
              </select>
            </div>

            {/* Ordenar */}
            <button className="flex items-center gap-1.5 hover:text-slate-900 transition">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span>Ordenar</span>
            </button>

            {/* Acciones en lote */}
            {selectedMessages.length > 0 && (
              <>
                <button
                  onClick={handleArchiveSelected}
                  title={activeTab === 'principal' ? 'Mover a Archivo' : 'Mover a Principal'}
                  className="flex items-center gap-1 text-[#581c2f] hover:text-[#72223c] font-bold"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>{activeTab === 'principal' ? 'Archivar' : 'Desarchivar'}</span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  title="Eliminar seleccionados"
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-bold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar</span>
                </button>
              </>
            )}

            {/* Clientes */}
            <button className="flex items-center gap-1.5 hover:text-slate-900 transition">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span>Contribuyentes</span>
            </button>
          </div>

          <div>
            <button
              onClick={() => {
                setFilterType('todos');
                setSearchQuery('');
              }}
              className="text-slate-400 hover:text-[#581c2f] transition font-medium"
            >
              Remover filtros
            </button>
          </div>
        </div>

        {/* Contenido / Lista de Mensajes o Empty State */}
        <div className="min-h-[360px] p-6 flex flex-col justify-center">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 max-w-md mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FBF0F3] text-[#581c2f] mb-4 border border-[#EED7DC]">
                <Mail className="h-8 w-8 stroke-[1.5]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Todo listo para recibir mensajes del SAT
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                A partir de ahora recibirás los comunicados, notificaciones y documentos que tus clientes con buzón activo reciban del SAT en PazSuma.
              </p>
            </div>
          ) : (
            <div className="space-y-2 divide-y divide-slate-100">
              {currentMessages.map(msg => {
                const isSelected = selectedMessages.includes(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl transition cursor-pointer ${
                      isSelected ? 'bg-[#FBF0F3]/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(msg.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#581c2f] focus:ring-[#581c2f]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{msg.razonSocial}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">{msg.rfc}</span>
                          {!msg.isRead && (
                            <span className="h-2 w-2 rounded-full bg-[#581c2f]" title="No leído" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{msg.title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{msg.date}</span>
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          try {
                            await generateBuzonNotificationPdf({
                              id: msg.id,
                              title: msg.title,
                              rfc: msg.rfc,
                              sender: 'Servicio de Administración Tributaria (SAT)',
                              date: msg.date,
                              preview: `Notificación de Acto Administrativo formal para el contribuyente ${msg.razonSocial} (${msg.rfc}). Comunicado oficial emitido a través del Buzón Tributario.`
                            });
                          } catch (err) {
                            console.error('Error al descargar notificación SAT:', err);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                        title="Descargar Acuse Oficial en PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
