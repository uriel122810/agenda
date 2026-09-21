'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, Filter, ShieldCheck, AlertTriangle,
  Clock, CheckCircle, ExternalLink, Sparkles, UploadCloud,
  FileText, MessageSquare, Phone, MoreHorizontal, X,
  FileSpreadsheet, ArrowUpRight, Share2, KeyRound
} from 'lucide-react';
import ClientDrawer from './ClientDrawer';
import ShareDocumentModal from './ShareDocumentModal';

interface ClientRFC {
  id: string;
  rfc: string;
  razonSocial: string;
  email: string;
  phone: string;
  status32D: 'positivo' | 'negativo' | 'pendiente';
  billingAccess: boolean;
  lastUpdate: string;
}

interface AlegraWorkspacesProps {
  searchQuery?: string;
}

export default function AlegraWorkspaces({ searchQuery: externalSearchQuery = '' }: AlegraWorkspacesProps = {}) {
  const [clients, setClients] = useState<ClientRFC[]>([
    {
      id: 'cli-1',
      rfc: 'XAXX010101000',
      razonSocial: 'Comercializadora Nacional SA de CV',
      email: 'facturacion@nacional.com',
      phone: '+52 5512345678',
      status32D: 'positivo',
      billingAccess: true,
      lastUpdate: '20 Sep 2026'
    },
    {
      id: 'cli-2',
      rfc: 'EADM910204AB1',
      razonSocial: 'Paula López Delgado',
      email: 'paula.lopez@gmail.com',
      phone: '+52 5598765432',
      status32D: 'positivo',
      billingAccess: false,
      lastUpdate: '18 Sep 2026'
    },
    {
      id: 'cli-3',
      rfc: 'IND980512KL3',
      razonSocial: 'Industrias y Aceros del Bajío S de RL',
      email: 'contacto@acerosbajio.mx',
      phone: '+52 4771239876',
      status32D: 'negativo',
      billingAccess: true,
      lastUpdate: '15 Sep 2026'
    }
  ]);

  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);

  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados de Drawer y Modal Compartir
  const [selectedClientForDrawer, setSelectedClientForDrawer] = useState<ClientRFC | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [clientForShare, setClientForShare] = useState<ClientRFC | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Formulario del modal 'Añadir cliente'
  const [newRfc, setNewRfc] = useState('');
  const [newRazonSocial, setNewRazonSocial] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [giveBillingAccess, setGiveBillingAccess] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const filteredClients = clients.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.rfc.toLowerCase().includes(q) ||
      c.razonSocial.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const countPositive = clients.filter(c => c.status32D === 'positivo').length;
  const countNegative = clients.filter(c => c.status32D === 'negativo').length;

  const handleSimulateAiUpload = () => {
    setIsAiProcessing(true);
    setTimeout(() => {
      setNewRfc('RFC980315TF8');
      setNewRazonSocial('Distribuidora y Logística de México SA de CV');
      setNewEmail('contacto@logistica-mx.com');
      setNewPhone('5544332211');
      setIsAiProcessing(false);
    }, 800);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRfc.trim() || !newRazonSocial.trim()) return;

    const newClient: ClientRFC = {
      id: `cli-${Date.now()}`,
      rfc: newRfc.trim().toUpperCase(),
      razonSocial: newRazonSocial.trim(),
      email: newEmail.trim() || 'cliente@ejemplo.com',
      phone: newPhone.trim() ? `+52 ${newPhone.trim()}` : '+52 5500000000',
      status32D: 'positivo',
      billingAccess: giveBillingAccess,
      lastUpdate: 'Hoy'
    };

    setClients(prev => [newClient, ...prev]);
    setIsModalOpen(false);
    setNewRfc('');
    setNewRazonSocial('');
    setNewEmail('');
    setNewPhone('');
    setGiveBillingAccess(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera de Espacio de Trabajo / Cartera de RFCs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Espacio de Trabajo / Cartera de RFCs
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Control institucional y consulta de cumplimiento fiscal 32-D ante el SAT
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#581c2f] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#72223c] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Añadir RFC</span>
          </button>
        </div>
      </div>

      {/* Indicadores de Cumplimiento SAT (32-D) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{countPositive + 37}</div>
            <div className="text-xs font-medium text-emerald-600">Positivos (32-D)</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{countNegative}</div>
            <div className="text-xs font-medium text-rose-600">Con observaciones</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">0</div>
            <div className="text-xs font-medium text-amber-600">En espera del SAT</div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF0F3] text-[#581c2f]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{clients.length}</div>
            <div className="text-xs font-semibold text-[#581c2f]">Expedientes Activos</div>
          </div>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs overflow-hidden">
        {/* Barra de búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-[#FAFAFC]">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por RFC, razón social o correo..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Total: <strong>{filteredClients.length}</strong> expedientes</span>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Razón Social</th>
                <th className="px-4 py-3.5">RFC</th>
                <th className="px-4 py-3.5">Opinión de Cumplimiento (32-D)</th>
                <th className="px-4 py-3.5">Facturación</th>
                <th className="px-4 py-3.5">Actualizado</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-[#FDFBF9] transition">
                  <td className="px-6 py-4">
                    <div
                      onClick={() => {
                        setSelectedClientForDrawer(client);
                        setIsDrawerOpen(true);
                      }}
                      className="font-bold text-slate-900 text-xs sm:text-sm hover:text-[#581c2f] cursor-pointer"
                    >
                      {client.razonSocial}
                    </div>
                    <div className="text-[11px] text-slate-400">{client.email} • {client.phone}</div>
                  </td>
                  <td className="px-4 py-4 font-mono font-semibold text-slate-700">
                    {client.rfc}
                  </td>
                  <td className="px-4 py-4">
                    {client.status32D === 'positivo' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle className="h-3 w-3" />
                        <span>Positiva</span>
                      </span>
                    ) : client.status32D === 'negativo' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Negativa</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3 w-3" />
                        <span>En espera</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {client.billingAccess ? (
                      <span className="rounded bg-[#FBF0F3] px-2 py-0.5 text-[10px] font-bold text-[#581c2f]">
                        Habilitado
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Solo lectura</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-400">
                    {client.lastUpdate}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientForDrawer(client);
                          setIsDrawerOpen(true);
                        }}
                        title="Ver detalles, e.firma y sellos CSD"
                        className="rounded-lg p-1 text-slate-500 hover:bg-[#FBF0F3] hover:text-[#581c2f] transition"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClientForShare(client);
                          setIsShareModalOpen(true);
                        }}
                        title="Compartir por WhatsApp o Correo"
                        className="rounded-lg p-1 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 'Añadir cliente' con IA en estilo PazSuma */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Añadir Expediente / RFC
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Registra el RFC para seguimiento de obligaciones y buzón SAT en PazSuma.
              </p>
            </div>

            {/* Dropzone con IA en tono vino #581c2f */}
            <div className="mt-5 rounded-xl border border-dashed border-[#eed7dc] bg-[#FBF0F3] p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#581c2f] mb-1">
                <Sparkles className="h-3.5 w-3.5 text-[#b39656]" />
                <span>Extracción Inteligente de CSF &lt;</span>
              </div>
              <p className="text-[11px] text-slate-600 max-w-xs mx-auto mb-3">
                Arrastra un archivo PDF o imagen con la Constancia de Situación Fiscal (CSF).
              </p>

              <button
                type="button"
                onClick={handleSimulateAiUpload}
                disabled={isAiProcessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#eed7dc] px-3.5 py-1.5 text-xs font-bold text-[#581c2f] shadow-2xs hover:bg-[#581c2f] hover:text-white transition disabled:opacity-50 cursor-pointer"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>{isAiProcessing ? 'Analizando documento...' : 'Cargar CSF'}</span>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveClient} className="mt-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    RFC *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRfc}
                    onChange={e => setNewRfc(e.target.value.toUpperCase())}
                    placeholder="RFC emisor"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRazonSocial}
                    onChange={e => setNewRazonSocial(e.target.value)}
                    placeholder="Nombre o empresa"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="contacto@empresa.com"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp de contacto
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500 font-medium">
                      +52
                    </span>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      placeholder="5512345678"
                      className="w-full rounded-r-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800">
                    Acceso al portal de consulta
                  </span>
                  <span className="text-[10px] text-[#581c2f] font-semibold">
                    Solo lectura y descarga
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGiveBillingAccess(!giveBillingAccess)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    giveBillingAccess ? 'bg-[#581c2f]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                      giveBillingAccess ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#581c2f] py-2.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#72223c] active:scale-[0.98]"
                >
                  Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer lateral de detalles del cliente / RFC */}
      <ClientDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        client={selectedClientForDrawer}
        onOpenShareModal={c => {
          setClientForShare(c);
          setIsShareModalOpen(true);
        }}
      />

      {/* Modal para compartir documentos por WhatsApp / Correo */}
      <ShareDocumentModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        defaultClientName={clientForShare?.razonSocial || 'Comercializadora Nacional'}
        defaultRfc={clientForShare?.rfc || 'XAXX010101000'}
      />
    </div>
  );
}
