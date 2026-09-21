'use client';

import React, { useState } from 'react';
import {
  Users, UserPlus, Mail, Shield, CheckCircle2, Clock,
  MoreHorizontal, Trash2, Send, X, ShieldAlert, UserCheck
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Contador Senior' | 'Auxiliar Contable' | 'Auditor';
  status: 'Aceptada' | 'Pendiente' | 'Expirada';
  invitationsCount: number;
  assignedClientsCount: number;
  joinedDate: string;
}

export default function AlegraTeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'usr-1',
      name: 'Uriel Gómez (Tú)',
      email: 'uriel@alegra.com',
      role: 'Administrador',
      status: 'Aceptada',
      invitationsCount: 1,
      assignedClientsCount: 40,
      joinedDate: '01 Ene 2026'
    },
    {
      id: 'usr-2',
      name: 'Ana Martínez',
      email: 'ana.martinez@despacho.com',
      role: 'Contador Senior',
      status: 'Aceptada',
      invitationsCount: 1,
      assignedClientsCount: 25,
      joinedDate: '15 Feb 2026'
    },
    {
      id: 'usr-3',
      name: 'Carlos Ruiz Solís',
      email: 'carlos.ruiz@despacho.com',
      role: 'Auxiliar Contable',
      status: 'Aceptada',
      invitationsCount: 2,
      assignedClientsCount: 15,
      joinedDate: '10 Mar 2026'
    },
    {
      id: 'usr-4',
      name: 'Mariana Vega',
      email: 'mariana.vega@consultores.mx',
      role: 'Auditor',
      status: 'Pendiente',
      invitationsCount: 1,
      assignedClientsCount: 0,
      joinedDate: 'Invitado ayer'
    }
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('Auxiliar Contable');

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: TeamMember = {
      id: `usr-${Date.now()}`,
      name: inviteName.trim() || inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'Aceptada', // Según requisito: Pill/Badge verde para 'Aceptada'
      invitationsCount: 1,
      assignedClientsCount: 0,
      joinedDate: 'Hoy'
    };

    setMembers(prev => [...prev, newMember]);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
  };

  const handleResendInvite = (memberId: string) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === memberId
          ? { ...m, invitationsCount: m.invitationsCount + 1 }
          : m
      )
    );
    alert('Invitación reenviada con éxito por correo electrónico.');
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm('¿Estás seguro de revocar el acceso a este colaborador?')) {
      setMembers(prev => prev.filter(m => m.id !== memberId));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Equipo y Colaboradores
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Administra los accesos de contadores, auxiliares y auditores en tu despacho
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00C9A7] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#00B596] active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Agregar colaborador</span>
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAF6] text-[#00A88B]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{members.length}</div>
            <div className="text-xs text-slate-500 font-medium">Colaboradores registrados</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {members.filter(m => m.status === 'Aceptada').length}
            </div>
            <div className="text-xs text-emerald-600 font-medium">Invitaciones aceptadas</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              {members.filter(m => m.status === 'Pendiente').length}
            </div>
            <div className="text-xs text-amber-600 font-medium">Invitaciones pendientes</div>
          </div>
        </div>
      </div>

      {/* Tabla con columnas: Usuario, Correo, Estado (Pill/Badge verde para "Aceptada"), Invitaciones */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Usuario</th>
                <th className="px-4 py-3.5">Correo</th>
                <th className="px-4 py-3.5">Rol / Permisos</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Invitaciones</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-slate-50/80 transition">
                  {/* Usuario */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDE9FE] text-xs font-bold text-[#7C3AED]">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">{member.name}</div>
                        <div className="text-[11px] text-slate-400">Se unió: {member.joinedDate}</div>
                      </div>
                    </div>
                  </td>

                  {/* Correo */}
                  <td className="px-4 py-4 text-slate-700 font-mono text-xs">
                    {member.email}
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <Shield className="h-3 w-3 text-slate-400" />
                      <span>{member.role}</span>
                    </span>
                  </td>

                  {/* Estado (Pill verde para 'Aceptada') */}
                  <td className="px-4 py-4">
                    {member.status === 'Aceptada' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Aceptada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3 w-3" />
                        <span>Pendiente</span>
                      </span>
                    )}
                  </td>

                  {/* Invitaciones */}
                  <td className="px-4 py-4 text-slate-600">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-[11px]">
                      {member.invitationsCount} enviada{member.invitationsCount > 1 ? 's' : ''}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResendInvite(member.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Reenviar invitación"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                      {member.role !== 'Administrador' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Eliminar del equipo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal '+ Agregar colaborador' */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Agregar colaborador</h3>
            <p className="text-xs text-slate-500 mb-4">
              Envía una invitación para colaborar en la gestión contable de tu despacho.
            </p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Ej: Lic. Mariana Vega"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colaborador@despacho.com"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol y nivel de permisos
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none"
                >
                  <option value="Contador Senior">Contador Senior (Acceso completo a clientes y pólizas)</option>
                  <option value="Auxiliar Contable">Auxiliar Contable (Captura de gastos, ingresos y tareas)</option>
                  <option value="Auditor">Auditor (Solo lectura y descarga de reportes fiscales)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#00C9A7] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00B596]"
                >
                  Enviar invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
