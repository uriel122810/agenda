'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Mail, Shield, CheckCircle2, Clock,
  MoreHorizontal, Trash2, Send, X, ShieldAlert, UserCheck, RefreshCw
} from 'lucide-react';
import {
  ColaboradorRecord,
  fetchColaboradores,
  saveColaborador,
  deleteColaborador,
  updateColaboradorInvitacion
} from '@/lib/crudService';
import { logAuditOperation } from '@/lib/auditService';

export default function AlegraTeamManager() {
  const [members, setMembers] = useState<ColaboradorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<ColaboradorRecord['role']>('Auxiliar Contable');

  // Carga inicial reactiva desde Supabase
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchColaboradores();
      setMembers(data);
    } catch (err) {
      console.error('Error cargando colaboradores de Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMemberData = {
      name: inviteName.trim() || inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      status: 'Aceptada' as const,
      invitationsCount: 1,
      assignedClientsCount: 0,
      joinedDate: 'Hoy'
    };

    const created = await saveColaborador(newMemberData);
    setMembers(prev => [created, ...prev.filter(m => m.id !== created.id)]);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');

    await logAuditOperation({
      usuario: 'Uriel Gómez',
      modulo: 'Colaboradores',
      accion: `Se registró colaborador ${created.name} (${created.role})`,
      detalles: `Email: ${created.email} • Estatus: ${created.status}`,
      status: 'completado'
    });
  };

  const handleResendInvite = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    const newCount = member.invitationsCount + 1;
    await updateColaboradorInvitacion(memberId, newCount);
    setMembers(prev =>
      prev.map(m =>
        m.id === memberId
          ? { ...m, invitationsCount: newCount }
          : m
      )
    );
    await logAuditOperation({
      usuario: 'Uriel Gómez',
      modulo: 'Colaboradores',
      accion: `Se reenvió invitación a ${member.email}`,
      detalles: `Total invitaciones: ${newCount}`,
      status: 'completado'
    });
    alert('Invitación reenviada con éxito y registrada en el sistema.');
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (confirm(`¿Estás seguro de revocar el acceso al colaborador ${member.name}?`)) {
      await deleteColaborador(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      await logAuditOperation({
        usuario: 'Uriel Gómez',
        modulo: 'Colaboradores',
        accion: `Se revocó acceso al colaborador ${member.name}`,
        detalles: `Email: ${member.email} • Rol: ${member.role}`,
        status: 'advertencia'
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Equipo y Colaboradores PazSuma
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Administra los accesos de contadores, auxiliares y auditores en la plataforma institucional
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadMembers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
            title="Sincronizar y recargar desde Supabase"
          >
            <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#581c2f] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#72223c] active:scale-[0.98]"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Agregar colaborador</span>
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF0F3] text-[#581c2f]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{members.length}</div>
            <div className="text-xs text-slate-500 font-medium">Colaboradores registrados</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
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

        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
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

      {/* Tabla */}
      <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs overflow-hidden">
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
                <tr key={member.id} className="hover:bg-[#FDFBF9] transition">
                  {/* Usuario */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#581c2f] text-xs font-bold text-white">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{member.name}</div>
                        <div className="text-[11px] text-slate-400">Ingreso: {member.joinedDate}</div>
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

                  {/* Estado */}
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
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-[#FBF0F3] hover:text-[#581c2f] transition"
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

            <h3 className="text-lg font-bold text-slate-900 mb-1">Agregar colaborador a PazSuma</h3>
            <p className="text-xs text-slate-500 mb-4">
              Envía una invitación para colaborar en la gestión institucional y foliado.
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
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo institucional *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colaborador@pazsuma.com"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol y nivel de permisos
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                >
                  <option value="Contador Senior">Contador Senior (Acceso completo a expedientes y pólizas)</option>
                  <option value="Auxiliar Contable">Auxiliar Contable (Captura de gastos, ingresos y tareas)</option>
                  <option value="Auditor">Auditor (Solo lectura y descarga de reportes oficiales)</option>
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
                  className="rounded-xl bg-[#581c2f] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#72223c]"
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
