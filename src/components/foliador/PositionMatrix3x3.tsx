'use client';

import React from 'react';
import { ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, Disc, ArrowRight, ArrowDownLeft, ArrowDown, ArrowDownRight, RotateCcw } from 'lucide-react';

export type MatrixPosition = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'free';

interface PositionMatrix3x3Props {
  currentMatrix: MatrixPosition;
  normX: number;
  normY: number;
  offsetX: number;
  offsetY: number;
  onMatrixSelect: (matrix: MatrixPosition, normX: number, normY: number) => void;
  onOffsetChange: (offsetX: number, offsetY: number) => void;
  accentColor?: string;
  label?: string;
}

const MATRIX_DEFINITIONS: Array<{
  id: MatrixPosition;
  label: string;
  icon: React.ReactNode;
  normX: number;
  normY: number;
}> = [
  { id: 'tl', label: 'Superior Izquierda', icon: <ArrowUpLeft className="h-3.5 w-3.5" />, normX: 0.05, normY: 0.05 },
  { id: 'tc', label: 'Superior Centro',    icon: <ArrowUp className="h-3.5 w-3.5" />,     normX: 0.50, normY: 0.05 },
  { id: 'tr', label: 'Superior Derecha',   icon: <ArrowUpRight className="h-3.5 w-3.5" />, normX: 0.95, normY: 0.05 },
  { id: 'ml', label: 'Medio Izquierda',    icon: <ArrowLeft className="h-3.5 w-3.5" />,   normX: 0.05, normY: 0.50 },
  { id: 'mc', label: 'Centro de Página',   icon: <Disc className="h-3.5 w-3.5" />,        normX: 0.50, normY: 0.50 },
  { id: 'mr', label: 'Medio Derecha',      icon: <ArrowRight className="h-3.5 w-3.5" />,  normX: 0.95, normY: 0.50 },
  { id: 'bl', label: 'Inferior Izquierda', icon: <ArrowDownLeft className="h-3.5 w-3.5" />, normX: 0.05, normY: 0.95 },
  { id: 'bc', label: 'Inferior Centro',    icon: <ArrowDown className="h-3.5 w-3.5" />,    normX: 0.50, normY: 0.95 },
  { id: 'br', label: 'Inferior Derecha',   icon: <ArrowDownRight className="h-3.5 w-3.5" />, normX: 0.95, normY: 0.95 }
];

export default function PositionMatrix3x3({
  currentMatrix,
  normX,
  normY,
  offsetX,
  offsetY,
  onMatrixSelect,
  onOffsetChange,
  accentColor = '#581c2f',
  label = 'Posición en Página'
}: PositionMatrix3x3Props) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
          {label}
        </label>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          {currentMatrix === 'free' ? 'Arrastre Libre' : currentMatrix.toUpperCase()}
          {` • (${Math.round(normX * 100)}%, ${Math.round(normY * 100)}%)`}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-3 items-center">
        {/* Cuadrícula 3x3 */}
        <div className="col-span-5 sm:col-span-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <div className="grid grid-cols-3 gap-1">
            {MATRIX_DEFINITIONS.map(pos => {
              const isActive = currentMatrix === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  title={pos.label}
                  onClick={() => onMatrixSelect(pos.id, pos.normX, pos.normY)}
                  className={`h-7 w-full rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#581c2f] text-white shadow-xs font-bold scale-105'
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 border border-slate-200/80'
                  }`}
                >
                  {pos.icon}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ajuste Fino Offsets X/Y */}
        <div className="col-span-7 sm:col-span-8 space-y-2">
          {/* Offset X */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-14 text-[10px] font-bold text-slate-500 uppercase">Offset X:</span>
            <input
              type="range"
              min={-120}
              max={120}
              value={offsetX}
              onChange={e => onOffsetChange(Number(e.target.value), offsetY)}
              className="flex-1 accent-[#581c2f] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <span className="w-12 text-right font-mono text-[11px] font-bold text-slate-700">
              {offsetX > 0 ? `+${offsetX}` : offsetX} pt
            </span>
          </div>

          {/* Offset Y */}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-14 text-[10px] font-bold text-slate-500 uppercase">Offset Y:</span>
            <input
              type="range"
              min={-120}
              max={120}
              value={offsetY}
              onChange={e => onOffsetChange(offsetX, Number(e.target.value))}
              className="flex-1 accent-[#581c2f] cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <span className="w-12 text-right font-mono text-[11px] font-bold text-slate-700">
              {offsetY > 0 ? `+${offsetY}` : offsetY} pt
            </span>
          </div>

          {/* Botón de reset de offset */}
          {(offsetX !== 0 || offsetY !== 0) && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => onOffsetChange(0, 0)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-[#581c2f] cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                <span>Restablecer offset a 0</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
