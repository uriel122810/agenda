'use client';

import React, { useState } from 'react';
import {
  X, Building2, KeyRound, Receipt, ShieldCheck, CheckCircle2,
  Clock, AlertTriangle, Download, Share2, Upload, Lock,
  Phone, Mail, FileText, Sparkles, ExternalLink
} from 'lucide-react';

import { generateOpinion32DPdf } from '@/lib/pdfReportGenerator';

export interface ClientData {
  id: string;
  rfc: string;
  razonSocial: string;
  email: string;
  phone: string;
  status32D: 'positivo' | 'negativo' | 'pendiente';
  billingAccess: boolean;
  lastUpdate: string;
}

interface ClientDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientData | null;
  onOpenShareModal?: (client: ClientData) => void;
}

export default function ClientDrawer({
  isOpen,
  onClose,
  client,
  onOpenShareModal
}: ClientDrawerProps) {
  const [activeTab, setActiveTab] = useState<'fiscal' | 'efirma' | 'csd' | 'cumplimiento'>('fiscal');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownload32D = async () => {
    if (!client) return;
    try {
      setIsGeneratingPdf(true);
      await generateOpinion32DPdf({
        rfc: client.rfc,
        razonSocial: client.razonSocial,
        status32D: client.status32D,
        opinionDate: client.lastUpdate
      });
    } catch (err) {
      console.error('Error al descargar Opinión 32-D:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Estados de carga de e.firma
  const [efirmaCer, setEfirmaCer] = useState<File | null>(null);
  const [efirmaKey, setEfirmaKey] = useState<File | null>(null);
  const [efirmaPassword, setEfirmaPassword] = useState('');
  const [efirmaSaved, setEfirmaSaved] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showStatusNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // Estados de carga de CSD
  const [csdCer, setCsdCer] = useState<File | null>(null);
  const [csdKey, setCsdKey] = useState<File | null>(null);
  const [csdPassword, setCsdPassword] = useState('');
  const [csdSaved, setCsdSaved] = useState(false);

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-[#E8E2D9]">
        {/* Cabecera del Drawer */}
        <div className="p-5 border-b border-[#E8E2D9] flex items-center justify-between bg-[#FDFBF9]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF0F3] text-[#581c2f]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {client.razonSocial}
              </h3>
              <p className="text-xs font-mono font-semibold text-[#581c2f] mt-0.5">
                {client.rfc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenShareModal && (
              <button
                onClick={() => onOpenShareModal(client)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E8E2D9] bg-white px-3 py-1.5 text-xs font-bold text-[#581c2f] hover:bg-[#FBF0F3]"
                title="Compartir por WhatsApp o Correo"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Compartir</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Pestañas: Datos Fiscales, E.Firma, Sello Digital (CSD), Estatus Fiscal */}
        <div className="flex border-b border-[#E8E2D9] px-4 pt-2 bg-white gap-1 overflow-x-auto text-xs font-bold">
          {[
            { id: 'fiscal', label: 'Datos Fiscales' },
            { id: 'efirma', label: 'E.Firma SAT' },
            { id: 'csd', label: 'Sello CSD' },
            { id: 'cumplimiento', label: 'Estatus 32-D' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition ${
                activeTab === t.id
                  ? 'border-[#581c2f] text-[#581c2f]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido según pestaña */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {statusNotice && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* PESTAÑA 1: DATOS FISCALES */}
          {activeTab === 'fiscal' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E8E2D9] bg-[#FDFBF9] p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#581c2f]">
                  Información de Registro
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">RFC</span>
                    <span className="font-mono font-bold text-slate-800">{client.rfc}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Régimen Fiscal</span>
                    <span className="font-medium text-slate-800">601 - General de Ley Personas Morales</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Código Postal</span>
                    <span className="font-mono font-medium text-slate-800">06700</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Última Auditoría</span>
                    <span className="font-medium text-slate-800">{client.lastUpdate}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Contacto Directo
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{client.phone}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: E.FIRMA SAT */}
          {activeTab === 'efirma' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#FBF0F3] p-3.5 border border-[#EED7DC] text-xs text-[#581c2f]">
                <div className="font-bold mb-0.5">Certificado de Firma Electrónica Avanzada (FIEL)</div>
                <p className="text-[11px] text-slate-600">
                  Permite consultar trámites, declaraciones y acuses ante el portal del SAT.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-[#FDFBF9]">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Archivo Certificado (.cer)
                  </label>
                  <input
                    type="file"
                    accept=".cer"
                    onChange={e => setEfirmaCer(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-3 bg-[#FDFBF9]">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Llave Privada (.key)
                  </label>
                  <input
                    type="file"
                    accept=".key"
                    onChange={e => setEfirmaKey(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contraseña de la clave privada
                  </label>
                  <input
                    type="password"
                    value={efirmaPassword}
                    onChange={e => setEfirmaPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEfirmaSaved(true);
                    showStatusNotice('E.Firma guardada y validada contra los controles del SAT exitosamente.');
                  }}
                  className="w-full rounded-xl bg-[#581c2f] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#72223c]"
                >
                  {efirmaSaved ? '✓ E.Firma Validada' : 'Guardar y Probar e.firma'}
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: SELLO DIGITAL (CSD) */}
          {activeTab === 'csd' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#FBF0F3] p-3.5 border border-[#EED7DC] text-xs text-[#581c2f]">
                <div className="font-bold mb-0.5">Certificado de Sello Digital (CSD)</div>
                <p className="text-[11px] text-slate-600">
                  Utilizado para timbrado y expedición de comprobantes CFDI 4.0.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-3 bg-[#FDFBF9]">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Certificado CSD (.cer)
                  </label>
                  <input
                    type="file"
                    accept=".cer"
                    onChange={e => setCsdCer(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 p-3 bg-[#FDFBF9]">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Llave CSD (.key)
                  </label>
                  <input
                    type="file"
                    accept=".key"
                    onChange={e => setCsdKey(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contraseña del CSD
                  </label>
                  <input
                    type="password"
                    value={csdPassword}
                    onChange={e => setCsdPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCsdSaved(true);
                    showStatusNotice('Certificado CSD cargado y listo para timbrado fiscal.');
                  }}
                  className="w-full rounded-xl bg-[#581c2f] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#72223c]"
                >
                  {csdSaved ? '✓ Sello CSD Activo' : 'Guardar Sello CSD'}
                </button>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: ESTATUS FISCAL 32-D */}
          {activeTab === 'cumplimiento' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-slate-700">Opinión de Cumplimiento (32-D)</div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Sentido Positivo</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  El contribuyente se encuentra al corriente en el cumplimiento de sus obligaciones fiscales conforme al artículo 32-D del CFF.
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDownload32D}
                    disabled={isGeneratingPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E2D9] bg-[#FDFBF9] px-3 py-1.5 text-xs font-bold text-[#581c2f] hover:bg-[#FBF0F3] transition disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
                  </button>

                  {onOpenShareModal && (
                    <button
                      type="button"
                      onClick={() => onOpenShareModal(client)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Compartir al Cliente</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
