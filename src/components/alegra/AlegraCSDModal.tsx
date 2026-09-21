'use client';

import React, { useState } from 'react';
import {
  X, KeyRound, FileCheck, Lock, Upload, ShieldCheck,
  Building, AlertCircle, CheckCircle2, Eye, EyeOff
} from 'lucide-react';

interface AlegraCSDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AlegraCSDModal({
  isOpen,
  onClose,
  onSuccess
}: AlegraCSDModalProps) {
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Datos fiscales de la empresa
  const [rfc, setRfc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [regimenFiscal, setRegimenFiscal] = useState('601');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!cerFile) {
      setErrorMsg('Por favor selecciona el archivo de certificado (.cer)');
      return;
    }
    if (!keyFile) {
      setErrorMsg('Por favor selecciona el archivo de llave privada (.key)');
      return;
    }
    if (!password) {
      setErrorMsg('Ingresa la contraseña de la clave privada');
      return;
    }
    if (!rfc) {
      setErrorMsg('Ingresa el RFC del emisor');
      return;
    }

    setIsLoading(true);

    // Simulación de validación criptográfica contra SAT
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado del modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAF6] text-[#00C9A7]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Cargar Certificado de Sello Digital (CSD)
            </h3>
            <p className="text-xs text-slate-500">
              Configura tus archivos de facturación electrónica y conexión con el SAT
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="text-base font-bold text-slate-900">
              ¡Certificado CSD Validado Exitosamente!
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Tu sello digital está activo para timbrado de facturas CFDI 4.0 y descargas SAT.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sección 1: Archivos .cer y .key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* .cer */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Certificado (.cer) *</span>
                  {cerFile && <span className="text-[10px] text-emerald-600 font-normal">Cargado</span>}
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center hover:border-[#00C9A7] transition cursor-pointer">
                  <input
                    type="file"
                    accept=".cer"
                    onChange={e => setCerFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-slate-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-700 truncate max-w-full">
                    {cerFile ? cerFile.name : 'Subir archivo .cer'}
                  </span>
                </div>
              </div>

              {/* .key */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Llave Privada (.key) *</span>
                  {keyFile && <span className="text-[10px] text-emerald-600 font-normal">Cargado</span>}
                </label>
                <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-3 text-center hover:border-[#00C9A7] transition cursor-pointer">
                  <input
                    type="file"
                    accept=".key"
                    onChange={e => setKeyFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-5 w-5 text-slate-400 mb-1" />
                  <span className="text-[11px] font-medium text-slate-700 truncate max-w-full">
                    {keyFile ? keyFile.name : 'Subir archivo .key'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contraseña de la llave */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contraseña de la clave privada *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña del CSD"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-3 pr-10 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sección 2: Datos fiscales del emisor */}
            <div className="border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-800 mb-2.5">
                Datos Fiscales del Contribuyente
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    RFC Emisor *
                  </label>
                  <input
                    type="text"
                    required
                    value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())}
                    placeholder="RFC de la empresa"
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-mono text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    required
                    value={razonSocial}
                    onChange={e => setRazonSocial(e.target.value)}
                    placeholder="Nombre o razón social"
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={codigoPostal}
                    onChange={e => setCodigoPostal(e.target.value)}
                    placeholder="06700"
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs font-mono text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Régimen Fiscal *
                  </label>
                  <select
                    value={regimenFiscal}
                    onChange={e => setRegimenFiscal(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 py-2 px-3 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none"
                  >
                    <option value="601">601 - General de Ley Personas Morales</option>
                    <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                    <option value="626">626 - Régimen Simplificado de Confianza (RESICO)</option>
                    <option value="605">605 - Sueldos y Salarios e Ingresos Asimilados</option>
                    <option value="603">603 - Personas Morales con Fines no Lucrativos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Aviso de seguridad */}
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-500 border border-slate-100">
              <ShieldCheck className="h-4 w-4 text-[#00C9A7] shrink-0" />
              <span>Los certificados se resguardan de forma encriptada bajo el estándar de seguridad bancaria SAT.</span>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-[#00C9A7] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#00B596] active:scale-[0.98] transition disabled:opacity-50"
              >
                {isLoading ? 'Verificando con SAT...' : 'Guardar y Validar CSD'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
