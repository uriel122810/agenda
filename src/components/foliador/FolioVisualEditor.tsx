'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud, Stamp, Download, Image as ImageIcon, Check,
  Sparkles, RefreshCw, Eye, Move, Sliders, Palette, Calendar,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, X, HelpCircle
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface FolioVisualEditorProps {
  initialFolio?: string;
  onFolioSaved?: (folioData: any) => void;
  onClose?: () => void;
}

export default function FolioVisualEditor({
  initialFolio = 'OFI-2026-0042',
  onFolioSaved,
  onClose
}: FolioVisualEditorProps) {
  // Archivo PDF objetivo
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);

  // Logo PNG personalizado
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoBytes, setLogoBytes] = useState<ArrayBuffer | null>(null);

  // Configuración del sello
  const [folioText, setFolioText] = useState(initialFolio);
  const [institutionText, setInstitutionText] = useState('PAZSUMA • GESTIÓN INSTITUCIONAL');
  const [dateText, setDateText] = useState('20 de Septiembre de 2026');
  const [securityHash, setSecurityHash] = useState('PZ-SEC-99A1');
  
  // Posición del sello
  const [position, setPosition] = useState<'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'watermark-center'>('top-right');
  
  // Color del sello (Paleta PazSuma)
  const [stampColor, setStampColor] = useState<'guinda' | 'dorado' | 'negro' | 'azul'>('guinda');
  const [opacity, setOpacity] = useState<number>(100); // 100% o menos para marca de agua
  const [fontSize, setFontSize] = useState<number>(10);
  const [includeQrSimulation, setIncludeQrSimulation] = useState(true);

  // Estados de proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [stampedPdfUrl, setStampedPdfUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Manejador de subida de PDF
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF válido.');
      return;
    }
    setPdfFile(file);
    setPdfFileName(file.name);
    const buffer = await file.arrayBuffer();
    setPdfBytes(buffer);
    setStampedPdfUrl(null);
  };

  // Manejador de subida de logo PNG personalizado
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes('png') && !file.type.includes('image/')) {
      alert('Se recomienda una imagen en formato PNG transparente.');
    }
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);
    const buffer = await file.arrayBuffer();
    setLogoBytes(buffer);
  };

  // Estampado real con pdf-lib
  const handleGenerateStampedPdf = async () => {
    setIsProcessing(true);
    setSuccessMessage('');

    try {
      let pdfDoc: PDFDocument;

      if (pdfBytes) {
        pdfDoc = await PDFDocument.load(pdfBytes);
      } else {
        // Si no subió PDF, creamos una página oficial en blanco para previsualizar y descargar
        pdfDoc = await PDFDocument.create();
        const blankPage = pdfDoc.addPage([595.28, 841.89]); // A4
        blankPage.drawText('DOCUMENTO OFICIAL PAZSUMA', {
          x: 50,
          y: 750,
          size: 16,
          color: rgb(0.34, 0.11, 0.18) // #581c2f
        });
        blankPage.drawText('Este documento incluye el folio digital y sello institucional generado.', {
          x: 50,
          y: 720,
          size: 10,
          color: rgb(0.4, 0.4, 0.4)
        });
      }

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Si subió un logo PNG, incrustarlo
      let embeddedLogo: any = null;
      if (logoBytes) {
        try {
          if (logoFile?.type.includes('png')) {
            embeddedLogo = await pdfDoc.embedPng(logoBytes);
          } else {
            embeddedLogo = await pdfDoc.embedJpg(logoBytes);
          }
        } catch (err) {
          console.warn('No se pudo incrustar imagen como PNG puro, continuando con sello vectorial:', err);
        }
      }

      // Color mapping
      let textColor = rgb(0.34, 0.11, 0.18); // guinda #581c2f
      let borderColor = rgb(0.34, 0.11, 0.18);
      let bgColor = rgb(0.98, 0.94, 0.95);

      if (stampColor === 'dorado') {
        textColor = rgb(0.70, 0.59, 0.34); // #b39656
        borderColor = rgb(0.70, 0.59, 0.34);
        bgColor = rgb(0.96, 0.94, 0.88);
      } else if (stampColor === 'negro') {
        textColor = rgb(0.1, 0.1, 0.1);
        borderColor = rgb(0.2, 0.2, 0.2);
        bgColor = rgb(0.95, 0.95, 0.95);
      } else if (stampColor === 'azul') {
        textColor = rgb(0.12, 0.23, 0.54);
        borderColor = rgb(0.12, 0.23, 0.54);
        bgColor = rgb(0.92, 0.95, 1.0);
      }

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Calcular coordenadas según la opción seleccionada
      let stampWidth = 190;
      let stampHeight = 65;
      let x = width - stampWidth - 36;
      let y = height - stampHeight - 36;

      if (position === 'top-left') {
        x = 36;
        y = height - stampHeight - 36;
      } else if (position === 'top-center') {
        x = (width - stampWidth) / 2;
        y = height - stampHeight - 36;
      } else if (position === 'bottom-right') {
        x = width - stampWidth - 36;
        y = 36;
      } else if (position === 'watermark-center') {
        // Marca de agua central grande
        stampWidth = 320;
        stampHeight = 110;
        x = (width - stampWidth) / 2;
        y = (height - stampHeight) / 2;
      }

      const alphaValue = Math.max(0.15, opacity / 100);

      // Dibujar caja contenedora del sello
      firstPage.drawRectangle({
        x,
        y,
        width: stampWidth,
        height: stampHeight,
        borderColor: borderColor,
        borderWidth: position === 'watermark-center' ? 2 : 1.5,
        color: bgColor,
        opacity: alphaValue,
        borderOpacity: alphaValue
      });

      // Si hay logo incrustado, dibujarlo dentro del sello
      if (embeddedLogo) {
        const logoDims = embeddedLogo.scaleToFit(32, 32);
        firstPage.drawImage(embeddedLogo, {
          x: x + 8,
          y: y + stampHeight - logoDims.height - 8,
          width: logoDims.width,
          height: logoDims.height,
          opacity: alphaValue
        });
      }

      const textOffsetX = embeddedLogo ? x + 46 : x + 10;

      // Dibujar textos del folio
      firstPage.drawText(folioText, {
        x: textOffsetX,
        y: y + stampHeight - 16,
        size: fontSize + 2,
        font: helveticaFont,
        color: textColor,
        opacity: alphaValue
      });

      firstPage.drawText(institutionText.substring(0, 30), {
        x: textOffsetX,
        y: y + stampHeight - 28,
        size: fontSize - 2,
        font: helveticaRegular,
        color: textColor,
        opacity: alphaValue
      });

      firstPage.drawText(`Fecha: ${dateText}`, {
        x: textOffsetX,
        y: y + stampHeight - 40,
        size: fontSize - 2.5,
        font: helveticaRegular,
        color: textColor,
        opacity: alphaValue
      });

      firstPage.drawText(`Seguridad: ${securityHash}`, {
        x: textOffsetX,
        y: y + stampHeight - 52,
        size: fontSize - 3,
        font: helveticaFont,
        color: textColor,
        opacity: alphaValue
      });

      // Guardar PDF modificado
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdfBytes) as unknown as BlobPart], { type: 'application/pdf' });
      const docUrl = URL.createObjectURL(blob);
      setStampedPdfUrl(docUrl);
      setSuccessMessage('¡Documento sellado y foliado exitosamente con tu logotipo!');

      if (onFolioSaved) {
        onFolioSaved({
          folio: folioText,
          fecha: dateText,
          archivo_nombre: pdfFileName || 'documento_foliado.pdf',
          url: docUrl
        });
      }
    } catch (error: any) {
      console.error('Error al generar PDF sellado:', error);
      alert('Ocurrió un error al procesar el archivo PDF: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Editor Visual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D9] pb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Stamp className="h-5 w-5 text-[#581c2f]" />
            <span>Editor Visual de Foliado y Sellos Oficiales</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sube tu logotipo PNG, ajusta la posición y estampa folios digitales sobre oficios y libros contables
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">{successMessage}</div>
          {stampedPdfUrl && (
            <a
              href={stampedPdfUrl}
              download={`${folioText}_oficial.pdf`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 font-bold transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar PDF</span>
            </a>
          )}
        </div>
      )}

      {/* Grid Principal: Panel de Controles (Izquierda) + Vista Previa Interactiva (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de Configuración (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. Subida de Archivos (PDF y Logo PNG) */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f]">
              1. Documento y Logotipo
            </h3>

            {/* Subir PDF */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Documento PDF objetivo
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#E8E2D9] bg-[#FDFBF9] p-3 text-xs text-slate-600 cursor-pointer hover:border-[#581c2f] transition">
                <UploadCloud className="h-5 w-5 text-[#581c2f] shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-[#581c2f]">
                    {pdfFileName ? pdfFileName : 'Seleccionar archivo PDF'}
                  </span>
                  <p className="text-[10px] text-slate-400">Si no seleccionas uno, se creará una plantilla oficial</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Subir Logo PNG */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Logotipo personalizado (PNG transparente)</span>
                {logoPreviewUrl && <span className="text-[10px] text-emerald-600 font-semibold">Cargado</span>}
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#E8E2D9] bg-[#FDFBF9] p-3 text-xs text-slate-600 cursor-pointer hover:border-[#581c2f] transition">
                {logoPreviewUrl ? (
                  <img src={logoPreviewUrl} alt="Logo" className="h-7 w-7 object-contain rounded" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-[#b39656] shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-semibold text-slate-800">
                    {logoFile ? logoFile.name : 'Subir escudo o logo institucional'}
                  </span>
                  <p className="text-[10px] text-slate-400">PNG con fondo transparente recomendado</p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 2. Parámetros del Folio */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f]">
              2. Parámetros y Leyendas
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Número de Folio *
                </label>
                <input
                  type="text"
                  value={folioText}
                  onChange={e => setFolioText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-mono font-bold text-[#581c2f] focus:border-[#581c2f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Fecha de Sellado
                </label>
                <input
                  type="text"
                  value={dateText}
                  onChange={e => setDateText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                Membrete Institucional
              </label>
              <input
                type="text"
                value={institutionText}
                onChange={e => setInstitutionText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Posición, Estilo y Color */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f]">
              3. Posición y Estilo Visual
            </h3>

            {/* Posición */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                Ubicación del Sello
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'top-right', label: 'Arriba Derecha' },
                  { id: 'top-left', label: 'Arriba Izquierda' },
                  { id: 'top-center', label: 'Arriba Centro' },
                  { id: 'bottom-right', label: 'Abajo Derecha' },
                  { id: 'watermark-center', label: 'Marca de agua central' }
                ].map(pos => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id as any)}
                    className={`rounded-lg p-2 text-left text-[11px] font-semibold border transition ${
                      position === pos.id
                        ? 'bg-[#FBF0F3] border-[#581c2f] text-[#581c2f]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Color */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                Paleta del Sello
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'guinda', label: 'Vino PazSuma', color: 'bg-[#581c2f]' },
                  { id: 'dorado', label: 'Dorado', color: 'bg-[#b39656]' },
                  { id: 'negro', label: 'Formal', color: 'bg-slate-900' },
                  { id: 'azul', label: 'Oficial', color: 'bg-blue-900' }
                ].map(col => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setStampColor(col.id as any)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                      stampColor === col.id ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${col.color}`} />
                    <span>{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opacidad / Marca de agua */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                <span>Opacidad</span>
                <span className="text-[#581c2f]">{opacity}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                className="w-full accent-[#581c2f]"
              />
            </div>
          </div>

          {/* Botón Principal de Estampado */}
          <button
            type="button"
            onClick={handleGenerateStampedPdf}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#581c2f] py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#72223c] active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
          >
            <Stamp className="h-4 w-4 text-[#b39656]" />
            <span>{isProcessing ? 'Estampando documento con pdf-lib...' : 'Generar y Estampar Folio Oficial'}</span>
          </button>
        </div>

        {/* Vista Previa Interactiva (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-[#581c2f]" />
                <span>Vista Previa del Documento (Hoja Membretada)</span>
              </span>
              <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-[10px] font-bold text-[#581c2f]">
                Escala 100%
              </span>
            </div>

            {/* Lienzo visual que simula la hoja A4 */}
            <div className="relative flex-1 min-h-[480px] bg-slate-100/70 rounded-xl p-4 flex items-center justify-center overflow-hidden">
              <div className="relative w-full max-w-[420px] aspect-[1/1.38] bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col justify-between select-none">
                {/* Contenido simulado de fondo */}
                <div className="space-y-3 opacity-40">
                  <div className="h-3 w-48 bg-slate-300 rounded" />
                  <div className="h-2 w-32 bg-slate-200 rounded" />
                  <div className="pt-6 space-y-2">
                    <div className="h-2 w-full bg-slate-200 rounded" />
                    <div className="h-2 w-full bg-slate-200 rounded" />
                    <div className="h-2 w-4/5 bg-slate-200 rounded" />
                    <div className="h-2 w-full bg-slate-200 rounded" />
                  </div>
                </div>

                {/* Sello colocado según la posición elegida */}
                <div
                  className={`absolute rounded-lg border-2 p-2 shadow-xs transition-all duration-200 ${
                    stampColor === 'guinda'
                      ? 'border-[#581c2f] bg-[#FBF0F3]/90 text-[#581c2f]'
                      : stampColor === 'dorado'
                      ? 'border-[#b39656] bg-[#F5EFDF]/90 text-[#b39656]'
                      : stampColor === 'azul'
                      ? 'border-blue-900 bg-blue-50/90 text-blue-900'
                      : 'border-slate-900 bg-slate-100/90 text-slate-900'
                  } ${
                    position === 'top-right'
                      ? 'top-4 right-4'
                      : position === 'top-left'
                      ? 'top-4 left-4'
                      : position === 'top-center'
                      ? 'top-4 left-1/2 -translate-x-1/2'
                      : position === 'bottom-right'
                      ? 'bottom-4 right-4'
                      : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-125'
                  }`}
                  style={{ opacity: opacity / 100 }}
                >
                  <div className="flex items-center gap-2">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-[#581c2f] text-white text-[10px] font-bold">
                        P
                      </div>
                    )}
                    <div>
                      <div className="font-mono text-xs font-extrabold tracking-wider">
                        {folioText}
                      </div>
                      <div className="text-[8px] font-semibold uppercase tracking-tight max-w-[130px] truncate">
                        {institutionText}
                      </div>
                      <div className="text-[8px] text-slate-500">
                        {dateText}
                      </div>
                      <div className="text-[7px] text-slate-400 font-mono">
                        {securityHash}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie simulado */}
                <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 opacity-60">
                  <span>PazSuma Control Documental</span>
                  <span>Página 1 de 1</span>
                </div>
              </div>
            </div>

            {stampedPdfUrl && (
              <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-[#FBF0F3] border border-[#EED7DC]">
                <span className="text-xs font-semibold text-[#581c2f]">
                  PDF procesado y listo para descarga
                </span>
                <a
                  href={stampedPdfUrl}
                  download={`${folioText}_oficial.pdf`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#581c2f] px-3 py-1 text-xs font-bold text-white hover:bg-[#72223c]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Descargar Archivo</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
