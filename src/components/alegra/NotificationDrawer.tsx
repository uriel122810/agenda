'use client';

import React, { useState } from 'react';
import {
  X, Bell, CheckCheck, Trash2, ShieldCheck, Mail, Users,
  Sparkles, CheckCircle2, Clock, Inbox, ChevronRight, Stamp
} from 'lucide-react';

interface NotificationItem {
  id: string;
  category: 'sistema' | 'novedades' | 'invitaciones';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: any) => void;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  onNavigateTab
}: NotificationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'todas' | 'sistema' | 'novedades' | 'invitaciones'>('todas');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      category: 'sistema',
      title: 'Validación SAT Exitosa (32-D)',
      description: 'Se recibieron 38 opiniones de cumplimiento positivas sin inconsistencias.',
      timestamp: 'Hace 15 min',
      isRead: false,
      actionLabel: 'Ver buzón SAT'
    },
    {
      id: 'notif-2',
      category: 'novedades',
      title: 'Editor de Foliado con Logo PNG Activo',
      description: 'Ya puedes subir tu escudo o logo institucional para estampar folios oficiales en PDF.',
      timestamp: 'Hace 1 hora',
      isRead: false,
      actionLabel: 'Probar editor'
    },
    {
      id: 'notif-3',
      category: 'invitaciones',
      title: 'Invitación de Colaborador Pendiente',
      description: 'Mariana Vega aún no ha confirmado su acceso como Auditor en el despacho.',
      timestamp: 'Ayer',
      isRead: true,
      actionLabel: 'Reenviar invitación'
    },
    {
      id: 'notif-4',
      category: 'sistema',
      title: 'Vencimiento de Sellos CSD',
      description: 'El certificado de la empresa "Industrias y Aceros" vence en 10 días.',
      timestamp: 'Ayer',
      isRead: true,
      actionLabel: 'Actualizar sello'
    }
  ]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'todas') return true;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop clic para cerrar */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer deslizante a la derecha */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-[#E8E2D9]">
        {/* Encabezado del Drawer */}
        <div className="p-4 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FDFBF9]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBF0F3] text-[#581c2f]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} avisos sin leer` : 'Estás al día'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas: Todas, Sistema, Novedades, Invitaciones */}
        <div className="flex border-b border-[#E8E2D9] px-3 pt-2 bg-white gap-1">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'sistema', label: 'Sistema' },
            { id: 'novedades', label: 'Novedades' },
            { id: 'invitaciones', label: 'Invitaciones' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-[#581c2f] text-[#581c2f]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Acciones Rápidas (Marcar leídas / Limpiar) */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 text-[11px] bg-slate-50/70">
            <button
              onClick={handleMarkAllAsRead}
              className="text-[#581c2f] hover:underline font-semibold flex items-center gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Marcar todas como leídas</span>
            </button>
            <button
              onClick={handleClearAll}
              className="text-slate-400 hover:text-rose-600 transition flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Limpiar todo</span>
            </button>
          </div>
        )}

        {/* Lista de Notificaciones o Estado Vacío */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredNotifications.length === 0 ? (
            /* Estado Vacío "¡Estás al día!" */
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FBF0F3] text-[#581c2f] mb-3 border border-[#EED7DC]">
                <CheckCircle2 className="h-8 w-8 text-[#581c2f]" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                ¡Estás al día!
              </h4>
              <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed">
                No tienes notificaciones pendientes ni alertas críticas en este momento.
              </p>
            </div>
          ) : (
            filteredNotifications.map(item => (
              <div
                key={item.id}
                onClick={() => handleMarkAsRead(item.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  !item.isRead
                    ? 'bg-[#FBF0F3]/60 border-[#eed7dc] shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !item.isRead ? 'bg-[#581c2f]' : 'bg-transparent'
                      }`}
                    />
                    <h5 className="text-xs font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {item.timestamp}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed pl-4">
                  {item.description}
                </p>

                {item.actionLabel && (
                  <div className="mt-2.5 pl-4 flex items-center justify-between border-t border-slate-100/80 pt-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (item.category === 'sistema' && onNavigateTab) {
                          onNavigateTab('buzon_sat');
                          onClose();
                        } else if (item.category === 'novedades' && onNavigateTab) {
                          onNavigateTab('foliador');
                          onClose();
                        } else if (item.category === 'invitaciones' && onNavigateTab) {
                          onNavigateTab('mi_equipo');
                          onClose();
                        }
                      }}
                      className="text-[11px] font-bold text-[#581c2f] hover:underline flex items-center gap-1"
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {item.category}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
