'use client';

import React, { useRef, useEffect, useState, useId } from 'react';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

export interface OfficialStampProps {
  date?: string | Date;
  operadoText?: string;
  institutionLine1?: string;
  institutionLine2?: string;
  institutionLine3?: string;
  inkBlue?: string;
  inkRed?: string;
  opacity?: number; // 0 to 1 or 0 to 100 (defaults to 0.88, simulating real rubber ink)
  width?: number; // width in points/pixels (default: 210)
  height?: number; // height in points/pixels (default: 105)
  shieldImageUrl?: string | null;
  isInteractive?: boolean;
  isSelected?: boolean;
  onResize?: (newWidth: number, newHeight: number) => void;
  className?: string;
  style?: React.CSSProperties;
  showTexture?: boolean;
  showBorder?: boolean;
}

export interface OfficialStampRenderOptions {
  date?: string | Date;
  operadoText?: string;
  institutionLine1?: string;
  institutionLine2?: string;
  institutionLine3?: string;
  inkBlue?: string;
  inkRed?: string;
  opacity?: number;
  width?: number;
  height?: number;
  shieldImageUrl?: string | null;
  shieldImageBytes?: ArrayBuffer | null;
  scale?: number; // for high DPI canvas rendering
  showBorder?: boolean;
}

export interface DrawOfficialStampPdfOptions extends OfficialStampRenderOptions {
  x: number;
  y: number; // in PDF points (0 at bottom)
}

/**
 * Spanish month abbreviations with period
 */
const SPANISH_MONTHS = [
  'ENE.', 'FEB.', 'MAR.', 'ABR.', 'MAY.', 'JUN.',
  'JUL.', 'AGO.', 'SEP.', 'OCT.', 'NOV.', 'DIC.'
];

/**
 * Formats a date into the exact official dater format: `DD MMM. YYYY` (e.g. `30 JUL. 2026`, `30 AGO. 2026`)
 */
export function formatOfficialStampDate(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = SPANISH_MONTHS[today.getMonth()] || 'ENE.';
    const year = today.getFullYear();
    return `${day} ${month} ${year}`;
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '30 JUL. 2026';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = SPANISH_MONTHS[dateInput.getMonth()] || 'ENE.';
    const year = dateInput.getFullYear();
    return `${day} ${month} ${year}`;
  }

  const str = String(dateInput).trim();

  // If already in "DD MMM. YYYY" format
  if (/^\d{1,2}\s+[A-Za-z]{3,4}\.?\s+\d{4}$/.test(str)) {
    return str.toUpperCase();
  }

  // If ISO date "YYYY-MM-DD" or similar
  const isoParts = str.split('T')[0].split('-');
  if (isoParts.length === 3) {
    const year = isoParts[0];
    const monthIdx = parseInt(isoParts[1], 10) - 1;
    const day = parseInt(isoParts[2], 10);
    if (!isNaN(monthIdx) && monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
      const monthStr = SPANISH_MONTHS[monthIdx] || 'ENE.';
      return `${String(day).padStart(2, '0')} ${monthStr} ${year}`;
    }
  }

  // Attempt standard date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = SPANISH_MONTHS[parsed.getMonth()] || 'ENE.';
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return str;
}

/**
 * Converts Hex color string (#rrggbb) to pdf-lib RGB values (0 to 1)
 */
export function hexToPdfRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 0 / 255, g: 51 / 255, b: 153 / 255 }; // Default #003399
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * High-fidelity vector heraldic shield component of H. Ayuntamiento de La Paz
 */
export function OfficialLaPazShieldSvg({
  color = '#003399',
  className = '',
  size = 34
}: {
  color?: string;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 110"
      width={size}
      height={size * 1.1}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Corona mural / Timbre heráldico en parte superior */}
      <path
        d="M20 22 L24 8 L38 15 L50 4 L62 15 L76 8 L80 22 Z"
        stroke={color}
        strokeWidth="2.8"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="35" cy="18" r="1.8" fill={color} />
      <circle cx="50" cy="14" r="2.2" fill={color} />
      <circle cx="65" cy="18" r="1.8" fill={color} />

      {/* Contorno exterior del escudo español */}
      <path
        d="M12 24 H88 V68 C88 88 50 106 50 106 C50 106 12 88 12 68 Z"
        stroke={color}
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Línea interior del escudo (doble filete) */}
      <path
        d="M17 28 H83 V66 C83 83 50 99 50 99 C50 99 17 83 17 66 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />

      {/* División en cruz de los cuarteles */}
      <line x1="50" y1="28" x2="50" y2="99" stroke={color} strokeWidth="1.5" />
      <line x1="17" y1="60" x2="83" y2="60" stroke={color} strokeWidth="1.5" />

      {/* Cuartel 1 (Sup. Izq.): Sol naciente y rayos sobre el mar de La Paz */}
      <path d="M26 50 A8 8 0 0 1 42 50 Z" fill={color} />
      <line x1="34" y1="36" x2="34" y2="33" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="25" y1="40" x2="22" y2="37" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="43" y1="40" x2="46" y2="37" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 54 Q34 50 48 54" stroke={color} strokeWidth="1.4" fill="none" />

      {/* Cuartel 2 (Sup. Der.): Cardón representativo de Baja California Sur */}
      <path
        d="M67 33 V56 M62 42 V48 H67 M72 39 V46 H67"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="67" cy="33" r="1.5" fill={color} />

      {/* Cuartel 3 (Inf. Izq.): Pez vela / fauna marina en las olas */}
      <path
        d="M24 78 Q36 71 44 78 Q34 76 24 78 Z"
        fill={color}
      />
      <path
        d="M22 84 Q34 81 46 84 M26 89 Q35 87 44 89"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cuartel 4 (Inf. Der.): Concha perlífera con perla de La Paz */}
      <path
        d="M58 80 Q67 67 76 80 Q67 86 58 80 Z"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
      />
      <circle cx="67" cy="78" r="2.8" fill={color} />
    </svg>
  );
}

/**
 * Generates an SVG string representation of the Official Stamp for export or canvas rendering
 */
export function generateOfficialStampSvgString(options: OfficialStampRenderOptions = {}): string {
  const {
    date = new Date(),
    operadoText = 'OPERADO',
    institutionLine1 = 'H. AYUNTAMIENTO',
    institutionLine2 = 'DE LA PAZ',
    institutionLine3 = '2024 - 2027',
    inkBlue = '#003399',
    inkRed = '#E62B4A',
    opacity = 0.88,
    width = 210,
    height = 105,
    shieldImageUrl = null,
    showBorder = true
  } = options;

  const normalizedOpacity = opacity > 1 ? opacity / 100 : opacity;
  const formattedDate = formatOfficialStampDate(date);

  const shieldContent = shieldImageUrl
    ? `<image href="${shieldImageUrl}" x="12" y="63" width="34" height="34" preserveAspectRatio="xMidYMid meet" />`
    : `
      <g transform="translate(12, 62) scale(0.32)">
        <path d="M20 22 L24 8 L38 15 L50 4 L62 15 L76 8 L80 22 Z" stroke="${inkBlue}" stroke-width="2.8" stroke-linejoin="round" fill="none" />
        <circle cx="35" cy="18" r="1.8" fill="${inkBlue}" />
        <circle cx="50" cy="14" r="2.2" fill="${inkBlue}" />
        <circle cx="65" cy="18" r="1.8" fill="${inkBlue}" />
        <path d="M12 24 H88 V68 C88 88 50 106 50 106 C50 106 12 88 12 68 Z" stroke="${inkBlue}" stroke-width="3.2" stroke-linejoin="round" fill="none" />
        <path d="M17 28 H83 V66 C83 83 50 99 50 99 C50 99 17 83 17 66 Z" stroke="${inkBlue}" stroke-width="1.5" stroke-linejoin="round" fill="none" />
        <line x1="50" y1="28" x2="50" y2="99" stroke="${inkBlue}" stroke-width="1.5" />
        <line x1="17" y1="60" x2="83" y2="60" stroke="${inkBlue}" stroke-width="1.5" />
        <path d="M26 50 A8 8 0 0 1 42 50 Z" fill="${inkBlue}" />
        <line x1="34" y1="36" x2="34" y2="33" stroke="${inkBlue}" stroke-width="1.6" stroke-linecap="round" />
        <line x1="25" y1="40" x2="22" y2="37" stroke="${inkBlue}" stroke-width="1.6" stroke-linecap="round" />
        <line x1="43" y1="40" x2="46" y2="37" stroke="${inkBlue}" stroke-width="1.6" stroke-linecap="round" />
        <path d="M20 54 Q34 50 48 54" stroke="${inkBlue}" stroke-width="1.4" fill="none" />
        <path d="M67 33 V56 M62 42 V48 H67 M72 39 V46 H67" stroke="${inkBlue}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <circle cx="67" cy="33" r="1.5" fill="${inkBlue}" />
        <path d="M24 78 Q36 71 44 78 Q34 76 24 78 Z" fill="${inkBlue}" />
        <path d="M22 84 Q34 81 46 84 M26 89 Q35 87 44 89" stroke="${inkBlue}" stroke-width="1.4" stroke-linecap="round" fill="none" />
        <path d="M58 80 Q67 67 76 80 Q67 86 58 80 Z" stroke="${inkBlue}" stroke-width="1.6" fill="none" />
        <circle cx="67" cy="78" r="2.8" fill="${inkBlue}" />
      </g>
    `;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 105" width="${width}" height="${height}" style="opacity: ${normalizedOpacity};">
  <defs>
    <filter id="ink-bleed-filter" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.65" xChannelSelector="R" yChannelSelector="G" result="displaced" />
      <feMerge>
        <feMergeNode in="displaced" />
      </feMerge>
    </filter>
  </defs>

  <g filter="url(#ink-bleed-filter)">
    ${showBorder ? `
    <!-- Borde exterior de goma -->
    <rect x="2.5" y="2.5" width="205" height="100" rx="5.5" ry="5.5" stroke="${inkBlue}" stroke-width="2.6" fill="none" />
    
    <!-- Filete interior de sello oficial -->
    <rect x="5.5" y="5.5" width="199" height="94" rx="3.5" ry="3.5" stroke="${inkBlue}" stroke-width="0.9" stroke-opacity="0.85" fill="none" />
    ` : ''}

    <!-- ── NIVEL 1: OPERADO (Texto Azul) ── -->
    <text
      x="105"
      y="26"
      text-anchor="middle"
      fill="${inkBlue}"
      font-family="'Arial Black', Impact, 'Segoe UI', system-ui, sans-serif"
      font-weight="900"
      font-size="20"
      letter-spacing="4px"
    >${operadoText}</text>

    ${showBorder ? `
    <!-- Línea divisoria superior -->
    <line x1="6" y1="34" x2="204" y2="34" stroke="${inkBlue}" stroke-width="1.8" />
    ` : ''}

    <!-- ── NIVEL 2: FECHA DINÁMICA (Texto Rojo) ── -->
    <text
      x="105"
      y="50.5"
      text-anchor="middle"
      fill="${inkRed}"
      font-family="'Courier New', Courier, 'Roboto Mono', monospace"
      font-weight="900"
      font-size="14.5"
      letter-spacing="3.2px"
    >${formattedDate}</text>

    ${showBorder ? `
    <!-- Línea divisoria inferior -->
    <line x1="6" y1="58" x2="204" y2="58" stroke="${inkBlue}" stroke-width="1.8" />
    ` : ''}

    <!-- ── NIVEL 3: LOGOTIPO INSTITUCIONAL (Escudo + Texto Azul) ── -->
    ${shieldContent}

    <!-- Línea 1: H. AYUNTAMIENTO -->
    <text
      x="54"
      y="71.5"
      text-anchor="start"
      fill="${inkBlue}"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      font-weight="700"
      font-size="8.8"
      letter-spacing="1.2px"
    >${institutionLine1}</text>

    <!-- Línea 2: DE LA PAZ (en negrita) -->
    <text
      x="54"
      y="84"
      text-anchor="start"
      fill="${inkBlue}"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      font-weight="900"
      font-size="11.8"
      letter-spacing="1.8px"
    >${institutionLine2}</text>

    <!-- Línea 3: 2024 - 2027 -->
    <text
      x="54"
      y="94"
      text-anchor="start"
      fill="${inkBlue}"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      font-weight="600"
      font-size="7.5"
      letter-spacing="2.4px"
    >${institutionLine3}</text>
  </g>
</svg>
  `.trim();
}

/**
 * Renders the Official Stamp onto an HTML5 Canvas element
 */
export async function renderOfficialStampToCanvas(
  canvas: HTMLCanvasElement,
  options: OfficialStampRenderOptions = {}
): Promise<void> {
  const {
    date = new Date(),
    operadoText = 'OPERADO',
    institutionLine1 = 'H. AYUNTAMIENTO',
    institutionLine2 = 'DE LA PAZ',
    institutionLine3 = '2024 - 2027',
    inkBlue = '#003399',
    inkRed = '#E62B4A',
    opacity = 0.88,
    width = 210,
    height = 105,
    shieldImageUrl = null,
    scale = 3, // 3x for 300 DPI high-res crispness
    showBorder = true
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = width * scale;
  canvas.height = height * scale;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);

  const normalizedOpacity = opacity > 1 ? opacity / 100 : opacity;
  ctx.globalAlpha = normalizedOpacity;

  // Base canvas coordinate width/height
  const w = width;
  const h = height;
  const sx = w / 210;
  const sy = h / 105;

  if (showBorder) {
    // Draw outer rounded rectangle
    ctx.strokeStyle = inkBlue;
    ctx.lineWidth = 2.6 * ((sx + sy) / 2);
    roundRect(ctx, 2.5 * sx, 2.5 * sy, (205) * sx, (100) * sy, 5.5 * sx);
    ctx.stroke();

    // Draw inner thin border
    ctx.lineWidth = 0.9 * ((sx + sy) / 2);
    ctx.globalAlpha = normalizedOpacity * 0.85;
    roundRect(ctx, 5.5 * sx, 5.5 * sy, (199) * sx, (94) * sy, 3.5 * sx);
    ctx.stroke();
    ctx.globalAlpha = normalizedOpacity;
  }

  // ── NIVEL 1: OPERADO ──
  ctx.fillStyle = inkBlue;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${Math.round(20 * sy)}px "Arial Black", Impact, sans-serif`;
  drawTextWithLetterSpacing(ctx, operadoText, (105) * sx, (26) * sy, 4 * sx);

  // Línea divisoria 1
  if (showBorder) {
    ctx.lineWidth = 1.8 * sy;
    ctx.beginPath();
    ctx.moveTo(6 * sx, 34 * sy);
    ctx.lineTo(204 * sx, 34 * sy);
    ctx.stroke();
  }

  // ── NIVEL 2: FECHA DINÁMICA EN ROJO ──
  const formattedDate = formatOfficialStampDate(date);
  ctx.fillStyle = inkRed;
  ctx.textAlign = 'center';
  ctx.font = `900 ${Math.round(14.5 * sy)}px "Courier New", Courier, monospace`;
  drawTextWithLetterSpacing(ctx, formattedDate, (105) * sx, (50.5) * sy, 3.2 * sx);

  // Línea divisoria 2
  if (showBorder) {
    ctx.strokeStyle = inkBlue;
    ctx.lineWidth = 1.8 * sy;
    ctx.beginPath();
    ctx.moveTo(6 * sx, 58 * sy);
    ctx.lineTo(204 * sx, 58 * sy);
    ctx.stroke();
  }

  // ── NIVEL 3: LOGOTIPO INSTITUCIONAL ──
  // Si hay imagen externa cargada, la dibujamos; si no, dibujamos el escudo heráldico en canvas
  if (shieldImageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // fallback gracefully
        img.src = shieldImageUrl;
      });
      ctx.drawImage(img, 12 * sx, 62 * sy, 34 * sx, 34 * sy);
    } catch {
      drawVectorShieldOnCanvas(ctx, 12 * sx, 62 * sy, 34 * sx, 34 * sy, inkBlue);
    }
  } else {
    drawVectorShieldOnCanvas(ctx, 12 * sx, 62 * sy, 34 * sx, 34 * sy, inkBlue);
  }

  // Texto Institucional
  ctx.fillStyle = inkBlue;
  ctx.textAlign = 'left';

  // Línea 1: H. AYUNTAMIENTO
  ctx.font = `700 ${Math.round(8.8 * sy)}px sans-serif`;
  drawTextWithLetterSpacing(ctx, institutionLine1, 54 * sx, 71.5 * sy, 1.2 * sx);

  // Línea 2: DE LA PAZ (en negrita)
  ctx.font = `900 ${Math.round(11.8 * sy)}px sans-serif`;
  drawTextWithLetterSpacing(ctx, institutionLine2, 54 * sx, 84 * sy, 1.8 * sx);

  // Línea 3: 2024 - 2027
  ctx.font = `600 ${Math.round(7.5 * sy)}px sans-serif`;
  drawTextWithLetterSpacing(ctx, institutionLine3, 54 * sx, 94 * sy, 2.4 * sx);

  // Micro-textura de tinta física (porosidad del caucho)
  applySubtleInkTexture(ctx, w, h);

  ctx.restore();
}

/**
 * Helper to apply micro-porosity to simulate manual rubber stamp ink absorption
 */
function applySubtleInkTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const imgData = ctx.getImageData(0, 0, Math.min(ctx.canvas.width, 1000), Math.min(ctx.canvas.height, 1000));
    const data = imgData.data;
    // Micro variation in alpha for porous rubber stamp feel
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] > 20) {
        const rand = (Math.random() - 0.5) * 22;
        data[i] = Math.max(10, Math.min(255, data[i] + rand));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Canvas might be tainted or offscreen, ignore gracefully
  }
}

/**
 * Helper to draw text with custom letter-spacing on Canvas 2D
 */
function drawTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
) {
  if (!text) return;
  const chars = Array.from(text);
  const totalCharWidths = chars.map(c => ctx.measureText(c).width);
  const totalWidth = totalCharWidths.reduce((a, b) => a + b, 0) + (chars.length - 1) * letterSpacing;

  let currentX = x;
  if (ctx.textAlign === 'center') {
    currentX = x - totalWidth / 2;
  } else if (ctx.textAlign === 'right') {
    currentX = x - totalWidth;
  }

  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], currentX, y);
    currentX += totalCharWidths[i] + letterSpacing;
  }

  ctx.textAlign = prevAlign;
}

/**
 * Helper to draw a rounded rectangle on Canvas 2D
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Helper to draw the La Paz heraldic shield vector paths onto Canvas 2D
 */
function drawVectorShieldOnCanvas(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  const s = Math.min(w / 100, h / 110);
  ctx.scale(s, s);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // Corona / Timbre
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(20, 22);
  ctx.lineTo(24, 8);
  ctx.lineTo(38, 15);
  ctx.lineTo(50, 4);
  ctx.lineTo(62, 15);
  ctx.lineTo(76, 8);
  ctx.lineTo(80, 22);
  ctx.closePath();
  ctx.stroke();

  // Contorno exterior
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(12, 24);
  ctx.lineTo(88, 24);
  ctx.lineTo(88, 68);
  ctx.bezierCurveTo(88, 88, 50, 106, 50, 106);
  ctx.bezierCurveTo(50, 106, 12, 88, 12, 68);
  ctx.closePath();
  ctx.stroke();

  // Filete interior
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(17, 28);
  ctx.lineTo(83, 28);
  ctx.lineTo(83, 66);
  ctx.bezierCurveTo(83, 83, 50, 99, 50, 99);
  ctx.bezierCurveTo(50, 99, 17, 83, 17, 66);
  ctx.closePath();
  ctx.stroke();

  // Cruz divisoria
  ctx.beginPath();
  ctx.moveTo(50, 28);
  ctx.lineTo(50, 99);
  ctx.moveTo(17, 60);
  ctx.lineTo(83, 60);
  ctx.stroke();

  // Sol naciente y cardón
  ctx.beginPath();
  ctx.arc(34, 50, 8, Math.PI, 0);
  ctx.fill();

  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(67, 33);
  ctx.lineTo(67, 56);
  ctx.moveTo(62, 42);
  ctx.lineTo(62, 48);
  ctx.lineTo(67, 48);
  ctx.moveTo(72, 39);
  ctx.lineTo(72, 46);
  ctx.lineTo(67, 46);
  ctx.stroke();

  // Concha y perla
  ctx.beginPath();
  ctx.arc(67, 78, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Generates PNG bytes for the official stamp for embedding into pdf-lib
 */
export async function generateOfficialStampPngBytes(
  options: OfficialStampRenderOptions = {}
): Promise<Uint8Array | null> {
  if (typeof document === 'undefined') {
    return null; // Headless environment without DOM
  }

  const canvas = document.createElement('canvas');
  await renderOfficialStampToCanvas(canvas, { ...options, scale: 3 });

  return new Promise<Uint8Array | null>(resolve => {
    canvas.toBlob(blob => {
      if (!blob) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Draws the Official 3-level stamp directly onto a pdf-lib PDFPage
 * Works both with embedded high-res PNG (preferred in browser) or pure vector fallback
 */
export async function drawOfficialStampOnPdf(
  page: PDFPage,
  pdfDoc: PDFDocument,
  options: DrawOfficialStampPdfOptions
): Promise<void> {
  const {
    x,
    y,
    width = 210,
    height = 105,
    opacity = 0.88,
    inkBlue = '#003399',
    inkRed = '#E62B4A',
    date = new Date(),
    operadoText = 'OPERADO',
    institutionLine1 = 'H. AYUNTAMIENTO',
    institutionLine2 = 'DE LA PAZ',
    institutionLine3 = '2024 - 2027',
    shieldImageBytes = null,
    showBorder = true
  } = options;

  const normalizedOpacity = opacity > 1 ? opacity / 100 : opacity;

  // 1. Try high-resolution PNG rendering via canvas if in browser environment
  try {
    const pngBytes = await generateOfficialStampPngBytes({
      ...options,
      showBorder,
      opacity: 1 // Keep PNG crisp, pdf-lib applies target opacity on placement
    });

    if (pngBytes) {
      const embeddedStamp = await pdfDoc.embedPng(pngBytes);
      page.drawImage(embeddedStamp, {
        x,
        y,
        width,
        height,
        opacity: normalizedOpacity
      });
      return;
    }
  } catch (err) {
    console.warn('Canvas PNG generation unavailable, falling back to pdf-lib vector drawing:', err);
  }

  // 2. Pure PDF-Lib Vector Fallback (always works in headless Node and browser)
  const blueColor = hexToPdfRgb(inkBlue);
  const redColor = hexToPdfRgb(inkRed);
  const pdfBlue = rgb(blueColor.r, blueColor.g, blueColor.b);
  const pdfRed = rgb(redColor.r, redColor.g, redColor.b);

  const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');
  const courierBold = await pdfDoc.embedFont('Courier-Bold');
  const helveticaRegular = await pdfDoc.embedFont('Helvetica');

  if (showBorder) {
    // Outer border
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderWidth: 2.4,
      borderColor: pdfBlue,
      borderOpacity: normalizedOpacity,
      color: rgb(1, 1, 1),
      opacity: 0.05 // Non-blocking, text underneath remains visible
    });

    // Inner border
    const inset = 3.5;
    page.drawRectangle({
      x: x + inset,
      y: y + inset,
      width: width - inset * 2,
      height: height - inset * 2,
      borderWidth: 0.8,
      borderColor: pdfBlue,
      borderOpacity: normalizedOpacity * 0.85
    });
  }

  // ── NIVEL 1: OPERADO ──
  const operadoFontSize = 18 * (height / 105);
  const operadoTextStr = (operadoText || 'OPERADO').toUpperCase();
  const operadoWidth = helveticaBold.widthOfTextAtSize(operadoTextStr, operadoFontSize);
  page.drawText(operadoTextStr, {
    x: x + (width - operadoWidth) / 2,
    y: y + height - 26 * (height / 105),
    size: operadoFontSize,
    font: helveticaBold,
    color: pdfBlue,
    opacity: normalizedOpacity
  });

  // Línea divisoria 1
  if (showBorder) {
    page.drawLine({
      start: { x: x + 6, y: y + height - 34 * (height / 105) },
      end: { x: x + width - 6, y: y + height - 34 * (height / 105) },
      thickness: 1.6,
      color: pdfBlue,
      opacity: normalizedOpacity
    });
  }

  // ── NIVEL 2: FECHA DINÁMICA EN ROJO ──
  const formattedDateStr = formatOfficialStampDate(date);
  const dateFontSize = 13 * (height / 105);
  const dateChars = Array.from(formattedDateStr);
  const charSpacing = 2.4;
  let totalDateWidth = 0;
  dateChars.forEach(ch => {
    totalDateWidth += courierBold.widthOfTextAtSize(ch, dateFontSize) + charSpacing;
  });
  totalDateWidth -= charSpacing;

  let curX = x + (width - totalDateWidth) / 2;
  const dateY = y + height - 51 * (height / 105);
  for (const ch of dateChars) {
    page.drawText(ch, {
      x: curX,
      y: dateY,
      size: dateFontSize,
      font: courierBold,
      color: pdfRed,
      opacity: normalizedOpacity
    });
    curX += courierBold.widthOfTextAtSize(ch, dateFontSize) + charSpacing;
  }

  // Línea divisoria 2
  if (showBorder) {
    page.drawLine({
      start: { x: x + 6, y: y + height - 58 * (height / 105) },
      end: { x: x + width - 6, y: y + height - 58 * (height / 105) },
      thickness: 1.6,
      color: pdfBlue,
      opacity: normalizedOpacity
    });
  }

  // ── NIVEL 3: LOGOTIPO INSTITUCIONAL ──
  // Si hay imagen de escudo incrustada
  if (shieldImageBytes) {
    try {
      const shieldImg = await pdfDoc.embedPng(shieldImageBytes);
      page.drawImage(shieldImg, {
        x: x + 12,
        y: y + 8,
        width: 34 * (width / 210),
        height: 34 * (height / 105),
        opacity: normalizedOpacity
      });
    } catch {
      // Fallback: draw heraldic vector shield outline on PDF
      try {
        page.drawSvgPath('M 0 30 L 26 30 C 26 14 13 0 13 0 C 13 0 0 14 0 30 Z', {
          x: x + 14,
          y: y + 9,
          borderColor: pdfBlue,
          borderWidth: 1.2,
          borderOpacity: normalizedOpacity
        });
      } catch {}
    }
  } else {
    // Draw heraldic vector shield outline on PDF
    try {
      page.drawSvgPath('M 0 30 L 26 30 C 26 14 13 0 13 0 C 13 0 0 14 0 30 Z', {
        x: x + 14,
        y: y + 9,
        borderColor: pdfBlue,
        borderWidth: 1.2,
        borderOpacity: normalizedOpacity
      });
    } catch {}
  }

  // Texto Institucional: Línea 1
  const line1Str = (institutionLine1 || 'H. AYUNTAMIENTO').toUpperCase();
  page.drawText(line1Str, {
    x: x + 52 * (width / 210),
    y: y + height - 73 * (height / 105),
    size: 8.5 * (height / 105),
    font: helveticaBold,
    color: pdfBlue,
    opacity: normalizedOpacity
  });

  // Línea 2: DE LA PAZ
  const line2Str = (institutionLine2 || 'DE LA PAZ').toUpperCase();
  page.drawText(line2Str, {
    x: x + 52 * (width / 210),
    y: y + height - 85 * (height / 105),
    size: 11.5 * (height / 105),
    font: helveticaBold,
    color: pdfBlue,
    opacity: normalizedOpacity
  });

  // Línea 3: 2024 - 2027
  const line3Str = institutionLine3 || '2024 - 2027';
  page.drawText(line3Str, {
    x: x + 52 * (width / 210),
    y: y + height - 95 * (height / 105),
    size: 7.2 * (height / 105),
    font: helveticaRegular,
    color: pdfBlue,
    opacity: normalizedOpacity
  });
}

/**
 * Reusable React Component for the 3-Level Official Stamp
 * Supports interactive dragging and resizing handles
 */
export default function OfficialStamp({
  date = new Date(),
  operadoText = 'OPERADO',
  institutionLine1 = 'H. AYUNTAMIENTO',
  institutionLine2 = 'DE LA PAZ',
  institutionLine3 = '2024 - 2027',
  inkBlue = '#003399',
  inkRed = '#E62B4A',
  opacity = 0.88,
  width = 210,
  height = 105,
  shieldImageUrl = null,
  isInteractive = false,
  isSelected = false,
  onResize,
  className = '',
  style = {},
  showTexture = true,
  showBorder = true
}: OfficialStampProps) {
  const filterId = useId();
  const formattedDate = formatOfficialStampDate(date);
  const normalizedOpacity = opacity > 1 ? opacity / 100 : opacity;

  // Handle Interactive Resizing via Drag Handle
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartPos = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: width, h: height });

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      w: width,
      h: height
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizing || !onResize) return;
    const deltaX = e.clientX - resizeStartPos.current.x;
    // Keep aspect ratio ~ 2:1
    const newWidth = Math.max(120, Math.min(360, Math.round(resizeStartPos.current.w + deltaX)));
    const newHeight = Math.round(newWidth / 2);
    onResize(newWidth, newHeight);
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <div
      className={`relative select-none inline-block ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        opacity: normalizedOpacity,
        mixBlendMode: 'multiply',
        ...style
      }}
    >
      <svg
        viewBox="0 0 210 105"
        width="100%"
        height="100%"
        className="w-full h-full pointer-events-none drop-shadow-xs"
        style={{ overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {showTexture && (
            <filter id={`ink-bleed-${filterId}`} x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.65" xChannelSelector="R" yChannelSelector="G" result="displaced" />
              <feMerge>
                <feMergeNode in="displaced" />
              </feMerge>
            </filter>
          )}
        </defs>

        <g filter={showTexture ? `url(#ink-bleed-${filterId})` : undefined}>
          {showBorder && (
            <>
              {/* Fondo sutil semi-translúcido para emular base de tinta */}
              <rect
                x="2.5"
                y="2.5"
                width="205"
                height="100"
                rx="5.5"
                ry="5.5"
                fill="#ffffff"
                fillOpacity="0.08"
              />

              {/* Borde exterior de sello de caucho */}
              <rect
                x="2.5"
                y="2.5"
                width="205"
                height="100"
                rx="5.5"
                ry="5.5"
                stroke={inkBlue}
                strokeWidth="2.6"
                fill="none"
              />

              {/* Filete interior fino */}
              <rect
                x="5.5"
                y="5.5"
                width="199"
                height="94"
                rx="3.5"
                ry="3.5"
                stroke={inkBlue}
                strokeWidth="0.9"
                strokeOpacity="0.85"
                fill="none"
              />
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 1. PARTE SUPERIOR (Texto Azul: OPERADO)                              */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <text
            x="105"
            y="26"
            textAnchor="middle"
            fill={inkBlue}
            fontFamily="'Arial Black', Impact, 'Segoe UI', system-ui, sans-serif"
            fontWeight="900"
            fontSize="20"
            letterSpacing="4px"
          >
            {operadoText}
          </text>

          {/* Línea divisoria superior */}
          {showBorder && (
            <line
              x1="6"
              y1="34"
              x2="204"
              y2="34"
              stroke={inkBlue}
              strokeWidth="1.8"
            />
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. PARTE CENTRAL (Fecha Dinámica en Rojo: DD MMM. YYYY)             */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <text
            x="105"
            y="50.5"
            textAnchor="middle"
            fill={inkRed}
            fontFamily="'Courier New', Courier, 'Roboto Mono', monospace"
            fontWeight="900"
            fontSize="14.5"
            letterSpacing="3.2px"
          >
            {formattedDate}
          </text>

          {/* Línea divisoria inferior */}
          {showBorder && (
            <line
              x1="6"
              y1="58"
              x2="204"
              y2="58"
              stroke={inkBlue}
              strokeWidth="1.8"
            />
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. PARTE INFERIOR (Logotipo Institucional en Azul)                 */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {shieldImageUrl ? (
            <image
              href={shieldImageUrl}
              x="12"
              y="63"
              width="34"
              height="34"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <g transform="translate(12, 62) scale(0.32)">
              <path d="M20 22 L24 8 L38 15 L50 4 L62 15 L76 8 L80 22 Z" stroke={inkBlue} strokeWidth="2.8" strokeLinejoin="round" fill="none" />
              <circle cx="35" cy="18" r="1.8" fill={inkBlue} />
              <circle cx="50" cy="14" r="2.2" fill={inkBlue} />
              <circle cx="65" cy="18" r="1.8" fill={inkBlue} />
              <path d="M12 24 H88 V68 C88 88 50 106 50 106 C50 106 12 88 12 68 Z" stroke={inkBlue} strokeWidth="3.2" strokeLinejoin="round" fill="none" />
              <path d="M17 28 H83 V66 C83 83 50 99 50 99 C50 99 17 83 17 66 Z" stroke={inkBlue} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
              <line x1="50" y1="28" x2="50" y2="99" stroke={inkBlue} strokeWidth="1.5" />
              <line x1="17" y1="60" x2="83" y2="60" stroke={inkBlue} strokeWidth="1.5" />
              <path d="M26 50 A8 8 0 0 1 42 50 Z" fill={inkBlue} />
              <line x1="34" y1="36" x2="34" y2="33" stroke={inkBlue} strokeWidth="1.6" strokeLinecap="round" />
              <line x1="25" y1="40" x2="22" y2="37" stroke={inkBlue} strokeWidth="1.6" strokeLinecap="round" />
              <line x1="43" y1="40" x2="46" y2="37" stroke={inkBlue} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M20 54 Q34 50 48 54" stroke={inkBlue} strokeWidth="1.4" fill="none" />
              <path d="M67 33 V56 M62 42 V48 H67 M72 39 V46 H67" stroke={inkBlue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="67" cy="33" r="1.5" fill={inkBlue} />
              <path d="M24 78 Q36 71 44 78 Q34 76 24 78 Z" fill={inkBlue} />
              <path d="M22 84 Q34 81 46 84 M26 89 Q35 87 44 89" stroke={inkBlue} strokeWidth="1.4" strokeLinecap="round" fill="none" />
              <path d="M58 80 Q67 67 76 80 Q67 86 58 80 Z" stroke={inkBlue} strokeWidth="1.6" fill="none" />
              <circle cx="67" cy="78" r="2.8" fill={inkBlue} />
            </g>
          )}

          {/* Línea 1: H. AYUNTAMIENTO */}
          <text
            x="54"
            y="71.5"
            textAnchor="start"
            fill={inkBlue}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontWeight="700"
            fontSize="8.8"
            letterSpacing="1.2px"
          >
            {institutionLine1}
          </text>

          {/* Línea 2: DE LA PAZ (en negrita) */}
          <text
            x="54"
            y="84"
            textAnchor="start"
            fill={inkBlue}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontWeight="900"
            fontSize="11.8"
            letterSpacing="1.8px"
          >
            {institutionLine2}
          </text>

          {/* Línea 3: 2024 - 2027 */}
          <text
            x="54"
            y="94"
            textAnchor="start"
            fill={inkBlue}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            fontWeight="600"
            fontSize="7.5"
            letterSpacing="2.4px"
          >
            {institutionLine3}
          </text>
        </g>
      </svg>

      {/* Indicador de selección y manijas de redimensionamiento */}
      {isSelected && isInteractive && (
        <div className="absolute inset-0 pointer-events-none ring-2 ring-blue-600 ring-offset-1 rounded-lg">
          {/* Badge de dimensiones */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-900 text-white text-[9px] px-1.5 py-0.5 rounded font-mono shadow-xs whitespace-nowrap">
            {width} × {height} pt
          </div>

          {/* Manija de Redimensionamiento interactiva en esquina inferior derecha */}
          {onResize && (
            <div
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-nwse-resize shadow-md pointer-events-auto transition-transform hover:scale-110"
              title="Arrastra para redimensionar el sello"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 8 L8 2 M5 8 L8 5 M8 8 L8 8" />
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
