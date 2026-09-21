'use client';

import React, { useState } from 'react';
import {
  X, MessageSquare, Mail, Phone, Send, FileText,
  CheckCircle2, Share2, Paperclip, ExternalLink, Copy, Check
} from 'lucide-react';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientName?: string;
  defaultRfc?: string;
}

export default function ShareDocumentModal({
  isOpen,
  onClose,
  defaultClientName = 'Comercializadora Nacional SA de CV',
  defaultRfc = 'XAXX010101000'
}: ShareDocumentModalProps) {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [phone, setPhone] = useState('5512345678');
  const [email, setEmail] = useState('cliente@empresa.com');
  const [customSubject, setCustomSubject] = useState(`Documentos Fiscales y Folios Oficiales — ${defaultClientName}`);
  
  // Documentos adjuntos seleccionables
  const [attachments, setAttachments] = useState({
    csf: true,
    opinion32D: true,
    folioPdf: false,
    balanza: false
  });

  const [message, setMessage] = useState(
    `Estimado cliente,\n\nLe compartimos sus documentos fiscales y folios oficiales expedidos a través de la plataforma PazSuma.\n\nQuedamos a sus órdenes para cualquier aclaración.`
  );

  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const toggleAttachment = (key: keyof typeof attachments) => {
    setAttachments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedAttachmentsList = [
    attachments.csf && 'Constancia_Situacion_Fiscal_SAT.pdf',
    attachments.opinion32D && 'Opinion_Cumplimiento_32D_Positiva.pdf',
    attachments.folioPdf && 'Oficio_Foliado_Oficial_PazSuma.pdf',
    attachments.balanza && 'Balanza_Comprobacion_Mensual.xlsx'
  ].filter(Boolean) as string[];

  const handleSend = () => {
    if (channel === 'whatsapp') {
      const cleanPhone = phone.replace(/\D/g, '');
      const fullText = `${message}\n\n📎 *Documentos adjuntos:* \n${selectedAttachmentsList.map(a => `• ${a}`).join('\n')}\n\n_Emitido por PazSuma Oficial_`;
      const url = `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(fullText)}`;
      window.open(url, '_blank');
    } else {
      const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(message)}`;
      window.open(mailtoUrl, '_blank');
    }
    onClose();
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-[#E8E2D9]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF0F3] text-[#581c2f]">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Compartir Documentos Institucionales y SAT
            </h3>
            <p className="text-xs text-slate-500">
              Expediente: <strong className="text-slate-700">{defaultClientName}</strong> ({defaultRfc})
            </p>
          </div>
        </div>

        {/* Selector de Canal: WhatsApp vs Correo */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-[#FDFBF9] border border-[#E8E2D9]">
          <button
            type="button"
            onClick={() => setChannel('whatsapp')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              channel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Enviar por WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              channel === 'email'
                ? 'bg-[#581c2f] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Enviar por Correo</span>
          </button>
        </div>

        {/* Grid de Formulario y Vista Previa */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Lado Izquierdo: Configuración */}
          <div className="md:col-span-6 space-y-3.5">
            {channel === 'whatsapp' ? (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Número de WhatsApp *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-600 font-bold">
                    +52
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="55 1234 5678"
                    className="w-full rounded-r-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Correo Electrónico Destinatario *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="destinatario@empresa.com"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                />
              </div>
            )}

            {/* Documentos Adjuntos */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Archivos a Adjuntar
              </label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-[#FDFBF9] cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={attachments.csf}
                    onChange={() => toggleAttachment('csf')}
                    className="h-4 w-4 rounded border-slate-300 text-[#581c2f] focus:ring-[#581c2f]"
                  />
                  <span className="font-medium text-slate-800">Constancia de Situación Fiscal (CSF)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-[#FDFBF9] cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={attachments.opinion32D}
                    onChange={() => toggleAttachment('opinion32D')}
                    className="h-4 w-4 rounded border-slate-300 text-[#581c2f] focus:ring-[#581c2f]"
                  />
                  <span className="font-medium text-slate-800">Opinión 32-D (SAT Positiva)</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-[#FDFBF9] cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={attachments.folioPdf}
                    onChange={() => toggleAttachment('folioPdf')}
                    className="h-4 w-4 rounded border-slate-300 text-[#581c2f] focus:ring-[#581c2f]"
                  />
                  <span className="font-medium text-slate-800">Oficio Foliado Oficial PDF</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-[#FDFBF9] cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={attachments.balanza}
                    onChange={() => toggleAttachment('balanza')}
                    className="h-4 w-4 rounded border-slate-300 text-[#581c2f] focus:ring-[#581c2f]"
                  />
                  <span className="font-medium text-slate-800">Balanza de Comprobación Contable</span>
                </label>
              </div>
            </div>

            {/* Mensaje */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase mb-1">
                <span>Mensaje Personalizado</span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[10px] text-[#581c2f] hover:underline flex items-center gap-1 font-semibold"
                >
                  {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{isCopied ? 'Copiado' : 'Copiar texto'}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
              />
            </div>
          </div>

          {/* Lado Derecho: Vista Previa Interactiva de Chat / Correo */}
          <div className="md:col-span-6 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-100 p-3.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                <span>Vista Previa del Mensaje</span>
                <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border">
                  {channel === 'whatsapp' ? 'WhatsApp Chat' : 'Correo Electrónico'}
                </span>
              </div>

              {channel === 'whatsapp' ? (
                /* Burbuja de WhatsApp interactiva */
                <div className="rounded-xl bg-[#DCF8C6] p-3 shadow-xs text-xs text-slate-800 space-y-2 border border-emerald-200">
                  <p className="whitespace-pre-line leading-relaxed text-[11px]">
                    {message}
                  </p>

                  {/* Documentos adjuntos mostrados como cards en WhatsApp */}
                  {selectedAttachmentsList.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200 space-y-1">
                      <div className="text-[10px] font-bold text-emerald-800">
                        📎 Archivos Adjuntos ({selectedAttachmentsList.length}):
                      </div>
                      {selectedAttachmentsList.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 bg-white/90 rounded p-1.5 text-[10px] font-medium text-slate-700 shadow-2xs"
                        >
                          <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                    <span>12:45 PM</span>
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  </div>
                </div>
              ) : (
                /* Tarjeta de correo interactiva */
                <div className="rounded-xl bg-white p-3 shadow-xs text-xs text-slate-800 space-y-2 border border-slate-200">
                  <div className="border-b pb-1.5 text-[11px] text-slate-500 space-y-0.5">
                    <div><strong>Para:</strong> {email}</div>
                    <div><strong>Asunto:</strong> {customSubject}</div>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-[11px]">
                    {message}
                  </p>
                  {selectedAttachmentsList.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold text-[#581c2f]">
                        Adjuntos ({selectedAttachmentsList.length}):
                      </div>
                      {selectedAttachmentsList.map((file, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Paperclip className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{file}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón de Enviar */}
            <div className="pt-3 mt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSend}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold text-white shadow-xs transition active:scale-[0.98] ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#581c2f] hover:bg-[#72223c]'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>{channel === 'whatsapp' ? 'Abrir WhatsApp y Enviar' : 'Enviar por Correo'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
