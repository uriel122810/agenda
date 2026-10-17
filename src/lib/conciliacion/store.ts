/**
 * PazSuma - Persistencia de Conciliaciones Bancarias
 * Mismo patrón que crudService: Supabase como fuente principal
 * (tabla conciliaciones_bancarias con el periodo completo en jsonb)
 * y localStorage como respaldo reactivo.
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

export async function fetchConciliaciones(): Promise<PeriodoConciliacion[]> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('conciliaciones_bancarias')
      .select('data')
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      const periodos = data.map(r => r.data as PeriodoConciliacion);
      setLocal(periodos);
      return periodos;
    }
  } catch (err) {
    console.info('Conciliaciones gestionadas con respaldo local:', err);
  }
  return getLocal();
}

/** Inserta o actualiza uno o varios periodos */
export async function saveConciliaciones(cambios: PeriodoConciliacion[]): Promise<void> {
  const actuales = getLocal();
  const ids = new Set(cambios.map(c => c.id));
  setLocal([...actuales.filter(p => !ids.has(p.id)), ...cambios]);

  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('conciliaciones_bancarias').upsert(
      cambios.map(p => ({
        id: p.id,
        cuenta_id: p.cuentaId,
        numero: p.numero,
        fecha_corte: p.fechaCorte,
        estado: p.estado,
        data: p,
        created_at: p.created_at,
        updated_at: new Date().toISOString()
      }))
    );
  } catch (err) {
    console.warn('Supabase upsert conciliación (respaldo local activo):', err);
  }
}

export async function deleteConciliacion(id: string): Promise<void> {
  setLocal(getLocal().filter(p => p.id !== id));
  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.from('conciliaciones_bancarias').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase delete conciliación:', err);
  }
}
