/**
 * PazSuma - Servicio Unificado de Auditoría y Trazabilidad Operacional
 * Permite registrar automáticamente eventos y operaciones del sistema
 * (pólizas, gastos, ingresos, folios, accesos, etc.) con persistencia en Supabase,
 * sincronización reactiva en tiempo real y política de retención de 15 días.
 */

import { createSupabaseBrowserClient } from './supabase/client';
import { AuditLog } from './auditSeedData';

export interface LogAuditParams {
  usuario?: string;
  email?: string;
  modulo: 'Foliador' | 'Buzón SAT' | 'Expedientes RFC' | 'Tareas' | 'Sellos CSD' | 'Contabilidad' | 'Bancos' | 'Contactos' | 'Inventario' | 'Usuarios' | 'Gastos' | 'Ingresos';
  accion: string;
  detalles?: string;
  ip?: string;
  status?: 'completado' | 'advertencia' | 'critico';
}

const STORAGE_KEY = 'pazsuma_custom_audit_logs_v1';
export const AUDIT_RETENTION_DAYS = 15;

/**
 * Filtra los registros que excedan los 15 días de antigüedad
 */
export function filterLogsBy15DaysRetention(logs: AuditLog[]): AuditLog[] {
  const cutoffMs = Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return logs.filter(log => {
    if (!log.created_at) {
      // Si no tiene created_at ISO, intentar parsear date o conservar si es reciente
      return true;
    }
    const logTime = new Date(log.created_at).getTime();
    return isNaN(logTime) || logTime >= cutoffMs;
  });
}

/**
 * Obtiene los registros de auditoría guardados localmente
 */
export function getStoredAuditLogs(): AuditLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: AuditLog[] = JSON.parse(raw);
    return filterLogsBy15DaysRetention(parsed);
  } catch (err) {
    console.warn('Error leyendo audit logs de localStorage:', err);
    return [];
  }
}

/**
 * Guarda los registros de auditoría localmente aplicando la política de retención de 15 días
 */
export function setStoredAuditLogs(logs: AuditLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    const validLogs = filterLogsBy15DaysRetention(logs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validLogs));
  } catch (err) {
    console.warn('Error guardando audit logs en localStorage:', err);
  }
}

/**
 * Función principal y reutilizable para registrar cualquier operación en el Historial de Auditoría
 * 
 * @example
 * await logAuditOperation({
 *   usuario: 'Uriel Gómez',
 *   modulo: 'Contabilidad',
 *   accion: 'Se registró póliza contable POL-DIA-421',
 *   detalles: 'Concepto: Pago de servicios • Cuadre: $15,000.00'
 * });
 */
export async function logAuditOperation(params: LogAuditParams): Promise<AuditLog> {
  const now = new Date();
  const isoDate = now.toISOString();
  const formattedDate = now.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ', ' + now.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user: params.usuario || 'Uriel Gómez',
    email: params.email || 'uriel@pazsuma.com',
    date: formattedDate,
    relativeTime: 'Hace un momento',
    module: params.modulo,
    action: params.accion,
    details: params.detalles,
    ip: params.ip || '189.240.12.94 • CDMX',
    status: params.status || 'completado',
    created_at: isoDate
  };

  // 1. Guardar en almacenamiento local reactivo (con depuración de >15 días)
  const existing = getStoredAuditLogs();
  const updatedLogs = [newLog, ...existing];
  setStoredAuditLogs(updatedLogs);

  // 2. Disparar evento personalizado en el navegador para actualización inmediata de la UI
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('pazsuma:audit-log', {
          detail: newLog
        })
      );
    } catch (e) {
      // Ignorar si el entorno no admite CustomEvent
    }
  }

  // 3. Persistir en Supabase (intentar en historial_operaciones y audit_logs)
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = createSupabaseBrowserClient();

      // Intentar inserción en public.historial_operaciones
      const { error: histError } = await supabase.from('historial_operaciones').insert({
        usuario: newLog.user,
        user_name: newLog.user,
        user_email: newLog.email,
        modulo: newLog.module,
        accion: newLog.action,
        detalles: newLog.details,
        ip_origen: newLog.ip,
        estatus: newLog.status,
        created_at: isoDate
      });

      if (histError) {
        // Si la tabla historial_operaciones aún no existe, intentar en audit_logs
        await supabase.from('audit_logs').insert({
          user_name: newLog.user,
          user_email: newLog.email,
          module: newLog.module,
          action: newLog.action,
          details: newLog.details,
          ip_origin: newLog.ip,
          status: newLog.status,
          created_at: isoDate
        });
      }

      // 4. Ejecutar política de retención en Supabase: eliminar registros > 15 días
      const cutoffDate = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('historial_operaciones').delete().lt('created_at', cutoffDate);
      await supabase.from('audit_logs').delete().lt('created_at', cutoffDate);
    }
  } catch (err) {
    // Si Supabase aún no tiene la tabla creada, el log se conserva de forma segura en local
    console.info('Registro de auditoría persistido localmente:', err);
  }

  return newLog;
}
