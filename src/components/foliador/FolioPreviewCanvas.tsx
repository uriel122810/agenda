'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Maximize2, Minimize2, Move, Layers, Eye,
  Sparkles, Check, ShieldCheck, Stamp, Image as ImageIcon,
  RotateCw, RefreshCw
} from 'lucide-react';
import {
  FolioConfig,
  OperadoStampConfig,
  LogoStampConfig,
  formatOfficialStampDate,
  generateFolioString
} from './stampEngine';
import OfficialStamp from './OfficialStamp';

export type ActiveElement = 'folio' | 'operado' | 'logo';

interface FolioPreviewCanvasProps {
  orientation: 'portrait' | 'landscape';
  onOrientationToggle: () => void;
  activeElement: ActiveElement;
  onSelectElement: (elem: ActiveElement) => void;
  folioConfig: FolioConfig;
  operadoConfig: OperadoStampConfig;
  logoConfig: LogoStampConfig;
  logoPreviewUrl: string | null;
  onUpdateFolioPosition: (normX: number, normY: number) => void;
  onUpdateOperadoPosition: (normX: number, normY: number) => void;
  onUpdateOperadoSize?: (width: number, height: number) => void;
  onUpdateLogoPosition: (normX: number, normY: number) => void;
  activeDocumentName?: string;
  totalPages?: number;
}

export default function FolioPreviewCanvas({
  orientation,
  onOrientationToggle,
  activeElement,
  onSelectElement,
  folioConfig,
  operadoConfig,
  logoConfig,
  logoPreviewUrl,
  onUpdateFolioPosition,
  onUpdateOperadoPosition,
  onUpdateOperadoSize,
  onUpdateLogoPosition,
  activeDocumentName,
  totalPages = 1
}: FolioPreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingTarget, setDraggingTarget] = useState<ActiveElement | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showRuler, setShowRuler] = useState(false);

  // Handle Dragging
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    element: ActiveElement,
    currentNormX: number,
    currentNormY: number
  ) => {
    e.stopPropagation();
    onSelectElement(element);
    setDraggingTarget(element);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const elemRect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    // Offset of the click within the dragged element
    setDragOffset({
      x: e.clientX - elemRect.left,
      y: e.clientY - elemRect.top
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingTarget || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate raw position relative to container
    const rawX = e.clientX - rect.left - dragOffset.x;
    const rawY = e.clientY - rect.top - dragOffset.y;

    // Approximate element sizes inside preview container
    let elemW = 160;
    let elemH = 50;
    if (draggingTarget === 'operado') {
      elemW = (operadoConfig.width || 210) * 0.78;
      elemH = (operadoConfig.height || 105) * 0.78;
    } else if (draggingTarget === 'logo') {
      elemW = (logoConfig.width || 60) * 0.9;
      elemH = (logoConfig.height || 60) * 0.9;
    }

    const maxX = Math.max(1, rect.width - elemW);
    const maxY = Math.max(1, rect.height - elemH);

    const clampedX = Math.max(0, Math.min(maxX, rawX));
    const clampedY = Math.max(0, Math.min(maxY, rawY));

    const normX = clampedX / maxX;
    const normY = clampedY / maxY;

    if (draggingTarget === 'folio') {
      onUpdateFolioPosition(normX, normY);
    } else if (draggingTarget === 'operado') {
      onUpdateOperadoPosition(normX, normY);
    } else if (draggingTarget === 'logo') {
      onUpdateLogoPosition(normX, normY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingTarget) {
      setDraggingTarget(null);
    }
  };

  // Folio Preview Content
  const previewFolioStr = generateFolioString(0, folioConfig);
  const operadoFormattedDate = formatOfficialStampDate(operadoConfig.stampDateIso);

  return (
    <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs flex flex-col space-y-3">
      {/* Barra de Encabezado de la Vista Previa */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-[#581c2f]/10 text-[#581c2f] flex items-center justify-center shrink-0">
            <Eye className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">
              {activeDocumentName || 'Hoja Oficial de Vista Previa'}
            </p>
            <p className="text-[10px] text-slate-400">
              Arrastra libremente cualquier elemento para ubicarlo con precisión
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle de Orientación: Vertical vs Horizontal */}
          <button
            type="button"
            onClick={onOrientationToggle}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Alternar orientación vertical u horizontal"
          >
            <RotateCw className="h-3 w-3 text-[#581c2f]" />
            <span>{orientation === 'portrait' ? 'Vertical (A4/Carta)' : 'Horizontal (Apaisado)'}</span>
          </button>

          {/* Toggle de Guías / Regla */}
          <button
            type="button"
            onClick={() => setShowRuler(!showRuler)}
            className={`p-1.5 rounded-lg border text-[11px] transition cursor-pointer ${
              showRuler
                ? 'bg-[#581c2f] text-white border-[#581c2f]'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Mostrar cuadrícula guía"
          >
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor del Lienzo con Fondo Neutro */}
      <div
        className="relative bg-slate-100/90 rounded-xl p-4 sm:p-6 flex items-center justify-center overflow-hidden min-h-[460px] select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Hoja de Papel con Proporciones Reales */}
        <div
          ref={containerRef}
          className={`relative bg-white rounded-lg shadow-xl border border-slate-200 transition-all duration-200 overflow-hidden ${
            orientation === 'portrait'
              ? 'w-full max-w-[390px] aspect-[1/1.414]'
              : 'w-full max-w-[540px] aspect-[1.414/1]'
          }`}
          style={{
            backgroundImage: showRuler
              ? 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)'
              : undefined,
            backgroundSize: '16px 16px'
          }}
        >
          {/* Contenido Simulado del Documento (Líneas de texto y membrete institucional de fondo) */}
          <div className="absolute inset-0 p-6 pointer-events-none flex flex-col justify-between opacity-30">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-400 pb-2">
                <div className="h-3 w-32 bg-slate-500 rounded" />
                <div className="h-2 w-16 bg-slate-400 rounded" />
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-2.5 w-3/4 bg-slate-400 rounded" />
                <div className="h-2 w-full bg-slate-300 rounded" />
                <div className="h-2 w-full bg-slate-300 rounded" />
                <div className="h-2 w-5/6 bg-slate-300 rounded" />
                <div className="h-2 w-full bg-slate-300 rounded" />
                <div className="h-2 w-4/5 bg-slate-300 rounded" />
                <div className="h-2 w-full bg-slate-300 rounded" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-300 flex justify-between text-[8px] font-mono text-slate-500">
              <span>DOCUMENTO OFICIAL • PAZSUMA</span>
              <span>Pág. 1 de {totalPages}</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 1. ELEMENTO ARRASTRABLE: FOLIO DE TEXTO                             */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {folioConfig.enabled && (
            <div
              onPointerDown={e => handlePointerDown(e, 'folio', folioConfig.normX, folioConfig.normY)}
              onClick={() => onSelectElement('folio')}
              style={{
                position: 'absolute',
                left: `calc(${folioConfig.normX * 100}% + ${folioConfig.offsetX * 0.4}px)`,
                top: `calc(${folioConfig.normY * 100}% + ${folioConfig.offsetY * 0.4}px)`,
                transform: 'translate(-50%, -50%)',
                opacity: folioConfig.opacity / 100,
                cursor: draggingTarget === 'folio' ? 'grabbing' : 'grab'
              }}
              className={`group z-20 transition-shadow select-none rounded-lg p-2 ${
                activeElement === 'folio'
                  ? 'ring-2 ring-[#581c2f] ring-offset-1 shadow-md'
                  : 'hover:ring-1 hover:ring-slate-400'
              } ${
                folioConfig.style === 'boxed'
                  ? 'bg-white/95 border-2 shadow-xs'
                  : folioConfig.style === 'line'
                  ? 'border-y-2 bg-white/70'
                  : 'bg-transparent'
              }`}
            >
              {/* Tooltip de Coordenadas Flotante durante arrastre o selección */}
              <div className="hidden group-hover:flex absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded font-mono pointer-events-none whitespace-nowrap shadow-xs">
                Folio • X: {Math.round(folioConfig.normX * 100)}% Y: {Math.round(folioConfig.normY * 100)}%
              </div>

              <div
                style={{
                  color: folioConfig.colorHex,
                  fontFamily: folioConfig.fontChoice === 'Courier'
                    ? 'monospace'
                    : folioConfig.fontChoice === 'TimesRoman'
                    ? 'serif'
                    : 'sans-serif',
                  fontWeight: folioConfig.isBold ? 700 : 500,
                  fontSize: `${Math.max(8, folioConfig.fontSize * 0.85)}px`,
                  borderColor: folioConfig.colorHex
                }}
                className="flex flex-col min-w-[120px] max-w-[210px]"
              >
                {folioConfig.showMetadata && (
                  <span className="text-[7px] font-bold tracking-tight opacity-80 uppercase truncate">
                    {folioConfig.institutionHeader || 'PAZSUMA • FOLIO OFICIAL'}
                  </span>
                )}
                <span className="tracking-wider">
                  FOLIO: {previewFolioStr}
                </span>
                {folioConfig.showMetadata && (
                  <span className="text-[6.5px] opacity-70">
                    FECHA: {new Date().toLocaleDateString('es-MX')} • PÁG. 1/{totalPages}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. ELEMENTO ARRASTRABLE: SELLO OFICIAL DE TRES NIVELES ("OPERADO")   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {operadoConfig.enabled && (
            <div
              onPointerDown={e => handlePointerDown(e, 'operado', operadoConfig.normX, operadoConfig.normY)}
              onClick={() => onSelectElement('operado')}
              style={{
                position: 'absolute',
                left: `calc(${operadoConfig.normX * 100}% + ${operadoConfig.offsetX * 0.4}px)`,
                top: `calc(${operadoConfig.normY * 100}% + ${operadoConfig.offsetY * 0.4}px)`,
                transform: 'translate(-50%, -50%)',
                cursor: draggingTarget === 'operado' ? 'grabbing' : 'grab'
              }}
              className={`group z-20 transition-all select-none rounded-lg ${
                activeElement === 'operado'
                  ? 'ring-2 ring-blue-600 ring-offset-2 shadow-xl'
                  : 'hover:ring-1 hover:ring-blue-400'
              }`}
            >
              {/* Tooltip de Coordenadas y Dimensiones Flotante */}
              <div className="hidden group-hover:flex absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-0.5 rounded font-mono pointer-events-none whitespace-nowrap shadow-md z-30">
                Sello Oficial 3 Niveles • X: {Math.round(operadoConfig.normX * 100)}% Y: {Math.round(operadoConfig.normY * 100)}% ({operadoConfig.width || 210}×{operadoConfig.height || 105} pt)
              </div>

              {/* Sello Oficial de Tres Niveles: OPERADO (Azul) + Fecha (Rojo) + H. Ayuntamiento (Azul) */}
              <OfficialStamp
                date={operadoConfig.stampDateIso}
                operadoText={operadoConfig.operadoWord || 'OPERADO'}
                institutionLine1={operadoConfig.institutionLine1 || operadoConfig.institutionText || 'H. AYUNTAMIENTO'}
                institutionLine2={operadoConfig.institutionLine2 || 'DE LA PAZ'}
                institutionLine3={operadoConfig.institutionLine3 || '2024 - 2027'}
                inkBlue={operadoConfig.colorHex || '#003399'}
                inkRed={operadoConfig.dateColorHex || '#E62B4A'}
                opacity={operadoConfig.opacity || 88}
                width={(operadoConfig.width || 210) * 0.78}
                height={(operadoConfig.height || 105) * 0.78}
                shieldImageUrl={operadoConfig.shieldImageUrl || null}
                isSelected={activeElement === 'operado'}
                isInteractive={true}
                onResize={(newW, newH) => {
                  if (onUpdateOperadoSize) {
                    onUpdateOperadoSize(Math.round(newW / 0.78), Math.round(newH / 0.78));
                  }
                }}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. ELEMENTO ARRASTRABLE: LOGOTIPO / IMAGEN PNG                       */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {logoConfig.enabled && logoPreviewUrl && (
            <div
              onPointerDown={e => handlePointerDown(e, 'logo', logoConfig.normX, logoConfig.normY)}
              onClick={() => onSelectElement('logo')}
              style={{
                position: 'absolute',
                left: `calc(${logoConfig.normX * 100}% + ${logoConfig.offsetX * 0.4}px)`,
                top: `calc(${logoConfig.normY * 100}% + ${logoConfig.offsetY * 0.4}px)`,
                transform: `translate(-50%, -50%) rotate(${logoConfig.rotationAngle || 0}deg)`,
                width: `${(logoConfig.width || 60) * 0.8}px`,
                height: `${(logoConfig.height || 60) * 0.8}px`,
                opacity: logoConfig.opacity / 100,
                cursor: draggingTarget === 'logo' ? 'grabbing' : 'grab'
              }}
              className={`group z-15 select-none transition-shadow ${
                activeElement === 'logo'
                  ? 'ring-2 ring-[#b39656] ring-offset-1 rounded-lg shadow-md'
                  : 'hover:ring-1 hover:ring-slate-400 rounded-lg'
              }`}
            >
              {/* Tooltip de Coordenadas Flotante */}
              <div className="hidden group-hover:flex absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded font-mono pointer-events-none whitespace-nowrap shadow-xs">
                Logo • Rotación: {logoConfig.rotationAngle}°
              </div>

              <img
                src={logoPreviewUrl}
                alt="Logo Stamp"
                className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Barra Inferior con Guías y Estado */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#581c2f]" />
            <span>Folio: {folioConfig.enabled ? 'Activo' : 'Oculto'}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#003399]" />
            <span>Sello Oficial 3 Niveles: {operadoConfig.enabled ? 'Activo (#003399 • #E62B4A)' : 'Oculto'}</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#b39656]" />
            <span>Logo PNG: {logoConfig.enabled && logoPreviewUrl ? `${logoConfig.rotationAngle}°` : 'Sin imagen'}</span>
          </span>
        </div>

        <span className="text-slate-400 font-mono text-[10px]">
          Fondo Underlay: {operadoConfig.isUnderlay ? 'Garantía de Legibilidad ON' : 'Opacidad Directa'}
        </span>
      </div>
    </div>
  );
}
