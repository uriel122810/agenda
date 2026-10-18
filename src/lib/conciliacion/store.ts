/**
 * PazSuma - Persistencia de Conciliaciones Bancarias
 *
 * Supabase (tabla conciliaciones_bancarias, periodo completo en jsonb) + copia local
 * en el navegador. Cada periodo lleva `actualizado` (marca de tiempo de la última
 * modificación); al cargar se combinan ambas fuentes y gana la versión más reciente,
 * de modo que un guardado fallido en la nube nunca "regresa" datos viejos.
 * Los errores de Supabase se reportan para poder avisar al usuario.
 */

import { createSupabaseBrowserClient } from '../supabase/client';
import type { PeriodoConciliacion } from './engine';

const LS_KEY = 'pazsuma_conciliaciones_v1';

function getLocal(): PeriodoConciliacion[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PeriodoConciliacion[]) : [];
  } catch {
    return [];
  }
}

function setLocal(periodos: PeriodoConciliacion[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(periodos));
  } catch (err) {
    console.warn('No se pudo guardar la conciliación en localStorage:', err);
  }
}

/** Copia guardada en este navegador (instantánea, para mostrar mientras responde la nube) */
export function leerConciliacionesLocales(): PeriodoConciliacion[] {
  return getLocal();
}

const marca = (p: PeriodoConciliacion) => p.actualizado ?? p.created_at ?? '';

/** Combina dos listas de periodos quedándose, por id, con la versión más reciente */
export function combinarPeriodos(a: PeriodoConciliacion[], b: PeriodoConciliacion[]): PeriodoConciliacion[] {
  const porId = new Map<string, PeriodoConciliacion>();
  for (const p of [...a, ...b]) {
    const previo = porId.get(p.id);
    if (!previo || marca(p) > marca(previo)) porId.set(p.id, p);
  }
  return [...porId.values()].sort((x, y) => (x.created_at ?? '').localeCompare(y.created_at ?? ''));
}

export interface ResultadoCarga {
  periodos: PeriodoConciliacion[];
  /** Periodos que sólo estaban (o estaban más nuevos) en este navegador y se volvieron a subir */
  resincronizados: number;
}

export async function fetchConciliaciones(): Promise<ResultadoCarga> {
  const locales = getLocal();
  let remotos: PeriodoConciliacion[] = [];
  let nubeDisponible = false;
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.from('conciliaciones_bancarias').select('data');
    if (!error && data) {
      nubeDisponible = true;
      remotos = data.map(r => r.data as PeriodoConciliacion);
    }
  } catch (err) {
    console.info('Conciliaciones gestionadas con respaldo local:', err);
  }
  const periodos = combinarPeriodos(remotos, locales);
  setLocal(periodos);

  // Lo que en este navegador es más nuevo que en la nube se vuelve a subir
  let resincronizados = 0;
  if (nubeDisponible) {
    const remotoPorId = new Map(remotos.map(p => [p.id, p]));
    const pendientes = periodos.filter(p => {
      const r = remotoPorId.get(p.id);
      return !r || marca(p) > marca(r);
    });
    if (pendientes.length) {
      const err = await subir(pendientes);
      if (!err) resincronizados = pendientes.length;
    }
  }
  return { periodos, resincronizados };
}

async function subir(periodos: PeriodoConciliacion[]): Promise<string | null> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('conciliaciones_bancarias').upsert(
      periodos.map(p => ({
        id: p.id,
        cuenta_id: p.cuentaId,
        numero: p.numero,
        fecha_corte: p.fechaCorte,
        estado: p.estado,
        data: p,
        created_at: p.created_at,
        updated_at: p.actualizado ?? new Date().toISOString()
      }))
    );
    if (error) {
      console.warn('Supabase upsert conciliación:', error);
      return error.message;
    }
    return null;
  } catch (err) {
    console.warn('Supabase upsert conciliación (respaldo local activo):', err);
    return null; // sin conexión: queda el respaldo local y se sincroniza al volver a cargar
  }
}

/**
 * Inserta o actualiza uno o varios periodos. Siempre se guardan en el navegador;
 * devuelve el mensaje de error de la nube si Supabase rechazó el guardado.
 */
export async function saveConciliaciones(cambios: PeriodoConciliacion[]): Promise<string | null> {
  const ahora = new Date().toISOString();
  const marcados = cambios.map(p => ({ ...p, actualizado: ahora }));
  const actuales = getLocal();
  const ids = new Set(marcados.map(c => c.id));
  setLocal([...actuales.filter(p => !ids.has(p.id)), ...marcados]);
  return subir(marcados);
}

export async function deleteConciliacion(id: string): Promise<string | null> {
  setLocal(getLocal().filter(p => p.id !== id));
  try {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from('conciliaciones_bancarias').delete().eq('id', id);
    return error ? error.message : null;
  } catch (err) {
    console.warn('Supabase delete conciliación:', err);
    return null;
  }
}
