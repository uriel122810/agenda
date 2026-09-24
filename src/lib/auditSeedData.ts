/**
 * PazSuma - Catálogo Semilla de 128 Eventos de Auditoría y Trazabilidad
 * Genera el registro detallado de las 128 operaciones realizadas durante la jornada,
 * abarcando todos los módulos: Foliador, Buzón SAT, Expedientes RFC, Tareas,
 * Sellos CSD, Contabilidad, Bancos, Contactos, Inventario y Usuarios.
 */

export interface AuditLog {
  id: string;
  user: string;
  email: string;
  date: string;
  relativeTime: string;
  module: 'Foliador' | 'Buzón SAT' | 'Expedientes RFC' | 'Tareas' | 'Sellos CSD' | 'Contabilidad' | 'Bancos' | 'Contactos' | 'Inventario' | 'Usuarios' | 'Gastos' | 'Ingresos' | 'Colaboradores';
  action: string;
  details?: string;
  ip: string;
  status: 'completado' | 'advertencia' | 'critico';
  created_at?: string;
}

const USERS = [
  { name: 'Uriel Gómez', email: 'uriel@pazsuma.com', ip: '189.240.12.94 • CDMX' },
  { name: 'Ana Martínez', email: 'ana.martinez@pazsuma.com', ip: '189.240.12.94 • CDMX' },
  { name: 'Carlos Ruiz', email: 'carlos.ruiz@pazsuma.com', ip: '187.189.44.11 • Guadalajara' },
  { name: 'Mariana Vega', email: 'mariana.vega@pazsuma.com', ip: '201.144.32.10 • Monterrey' },
  { name: 'Roberto Mendoza', email: 'roberto.mendoza@pazsuma.com', ip: '189.240.12.94 • CDMX' },
  { name: 'Sistema Automático', email: 'sistema@pazsuma.com', ip: 'Servidor Seguro • AWS us-east-1' }
];

export function generate128AuditLogs(): AuditLog[] {
  const list: AuditLog[] = [];

  // 1 a 5: Eventos destacados de la última hora
  list.push(
    {
      id: 'log-1',
      user: 'Uriel Gómez',
      email: 'uriel@pazsuma.com',
      date: '20 Sep 2026, 23:52:14',
      relativeTime: 'Hace 8 min',
      module: 'Foliador',
      action: 'Se estampó folio oficial OFI-2026-0042 con logotipo institucional',
      details: 'Archivo: oficio_presidencia_v2.pdf (4 páginas foliadas en esquina superior derecha)',
      ip: '189.240.12.94 • CDMX',
      status: 'completado'
    },
    {
      id: 'log-2',
      user: 'Ana Martínez',
      email: 'ana.martinez@pazsuma.com',
      date: '20 Sep 2026, 23:35:10',
      relativeTime: 'Hace 25 min',
      module: 'Buzón SAT',
      action: 'Sincronización masiva de opiniones de cumplimiento 32-D',
      details: '38 opiniones positivas confirmadas por los servicios web del SAT',
      ip: '189.240.12.94 • CDMX',
      status: 'completado'
    },
    {
      id: 'log-3',
      user: 'Uriel Gómez',
      email: 'uriel@pazsuma.com',
      date: '20 Sep 2026, 23:12:00',
      relativeTime: 'Hace 48 min',
      module: 'Sellos CSD',
      action: 'Validación de certificado de sello digital .cer y .key',
      details: 'RFC: PAZ240101XYZ - Vigencia verificada hasta Octubre 2028',
      ip: '189.240.12.94 • CDMX',
      status: 'completado'
    },
    {
      id: 'log-4',
      user: 'Carlos Ruiz',
      email: 'carlos.ruiz@pazsuma.com',
      date: '20 Sep 2026, 22:50:15',
      relativeTime: 'Hace 1 hora',
      module: 'Tareas',
      action: 'Se movió tarea "Declaración Mensual IVA" a columna En Proceso',
      details: 'Asignado a: Carlos Ruiz Solís con prioridad Alta',
      ip: '187.189.44.11 • Guadalajara',
      status: 'completado'
    },
    {
      id: 'log-5',
      user: 'Sistema Automático',
      email: 'sistema@pazsuma.com',
      date: '20 Sep 2026, 22:30:00',
      relativeTime: 'Hace 1 hora',
      module: 'Expedientes RFC',
      action: 'Extracción inteligente de Constancia CSF con IA',
      details: 'RFC: IND980512KL3 validado contra lista negra 69-B del SAT (Sin coincidencias)',
      ip: 'Servidor Seguro • AWS us-east-1',
      status: 'completado'
    }
  );

  // Generación sistemática de los eventos 6 al 128 cubriendo toda la jornada
  const templates = [
    {
      module: 'Foliador' as const,
      actions: [
        'Estampado y certificación de folio de correspondencia oficial',
        'Generación de acuse digital con código de validación SHA-256',
        'Descarga de Libro Consecutivo de Folios en formato PDF oficial',
        'Validación de consistencia y foliado en lote de documentos anexos',
        'Registro de nuevo documento en libro de gobierno y archivo digital',
        'Cancelación y sustitución de folio con acuse de nulidad'
      ]
    },
    {
      module: 'Buzón SAT' as const,
      actions: [
        'Consulta automatizada de mensajes pendientes en Buzón Tributario',
        'Generación de Acuse Certificado de Notificación por estrados',
        'Descarga de opinión de cumplimiento 32-D con firma digital SAT',
        'Lectura y clasificación de aviso sobre saldo a favor de IVA',
        'Recepción de comunicado de invitación para regularización de nómina',
        'Descarga de constancia de situación fiscal actualizada'
      ]
    },
    {
      module: 'Expedientes RFC' as const,
      actions: [
        'Auditoría y cruce de proveedores contra el listado del artículo 69-B',
        'Actualización de régimen fiscal y actividades económicas en expediente',
        'Validación de domicilio fiscal y estatus de localizable ante el SAT',
        'Extracción automatizada de datos fiscales mediante OCR avanzado',
        'Carga masiva de cédulas de identificación fiscal de clientes',
        'Emisión de dictamen preventivo de cumplimiento para licitación'
      ]
    },
    {
      module: 'Sellos CSD' as const,
      actions: [
        'Comprobación de vigencia del Certificado de Sello Digital (CSD)',
        'Sincronización de firma electrónica avanzada (e.firma) con SAT',
        'Prueba de timbrado fiscal en ambiente de certificación PAC',
        'Verificación de cadena original y sello criptográfico RSA',
        'Almacenamiento seguro en bóveda de llaves criptográficas',
        'Alerta de renovación preventiva por vencimiento próximo a 90 días'
      ]
    },
    {
      module: 'Contabilidad' as const,
      actions: [
        'Generación de póliza de diario con cuadre automático Debe/Haber',
        'Emisión de Balanza de Comprobación consolidada para SAT XML',
        'Cálculo preliminar de coeficiente de utilidad y pago provisional',
        'Conciliación de CFDI emitidos contra registros contables de ingresos',
        'Cierre preliminar del período contable mensual',
        'Ajuste de fluctuación cambiaria para cuentas en divisa extranjera'
      ]
    },
    {
      module: 'Bancos' as const,
      actions: [
        'Conciliación de movimientos bancarios BBVA Bancomer Cta. 4912',
        'Importación de extracto bancario en formato estándar SAT',
        'Identificación automática de depósitos no reconocidos',
        'Registro de dispersión de pago a proveedores con comprobante CEP',
        'Cuadre de saldos en libros contables vs saldo bancario disponible',
        'Autorización de transferencia interbancaria SPEI con doble factor'
      ]
    },
    {
      module: 'Contactos' as const,
      actions: [
        'Alta de nuevo cliente institucional con validación de RFC',
        'Actualización de correo para recepción de facturas electrónicas',
        'Modificación de límite de crédito comercial y condiciones de pago',
        'Registro de cuenta CLABE para dispersión de pagos a contratistas',
        'Auditoría de datos de contacto de clientes para emisión 4.0',
        'Asignación de cartera de clientes a contador responsable'
      ]
    },
    {
      module: 'Inventario' as const,
      actions: [
        'Sincronización de catálogo de claves SAT de productos y servicios',
        'Ajuste físico de inventario y registro de merma autorizada',
        'Actualización de precios de lista con desglose de IVA y retenciones',
        'Recepción de orden de compra y registro de existencias en almacén',
        'Validación de códigos de barras y claves internas de control',
        'Generación de reporte de valuación de inventario método PEPS'
      ]
    },
    {
      module: 'Tareas' as const,
      actions: [
        'Creación de tarea: "Revisión de papeles de trabajo de auditoría"',
        'Asignación de responsable para cálculo de retenciones ISR salarios',
        'Cambio de prioridad a Urgente en tarea de contestación al SAT',
        'Adjunto de evidencias documentales a tarea de cierre contable',
        'Notificación de vencimiento próximo para presentación de DIOT',
        'Finalización de checklist de verificación de obligaciones fiscales'
      ]
    },
    {
      module: 'Usuarios' as const,
      actions: [
        'Inicio de sesión exitoso con autenticación de dos factores (2FA)',
        'Actualización de permisos de visualización para rol Auditor',
        'Renovación periódica de contraseña de acceso a plataforma',
        'Auditoría de sesiones activas y cierre de conexiones inactivas',
        'Asignación de certificado digital exclusivo a usuario senior',
        'Verificación de política de seguridad y bloqueo tras intentos fallidos'
      ]
    }
  ];

  let currentHour = 22;
  let currentMinute = 15;

  for (let i = 6; i <= 128; i++) {
    const userObj = USERS[i % USERS.length];
    const category = templates[(i - 6) % templates.length];
    const actionText = category.actions[(i * 3) % category.actions.length];
    
    // Decrementar minutos progresivamente para cubrir desde las 22:15 hasta las 08:10 del día
    currentMinute -= Math.floor((14 * 60) / 122); // aproximadamente 7 minutos por paso
    if (currentMinute < 0) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = ((currentMinute % 60) + 60) % 60;
    }
    if (currentHour < 8) currentHour = 8;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateFormatted = `20 Sep 2026, ${pad(currentHour)}:${pad(currentMinute)}:${pad((i * 17) % 60)}`;
    
    const diffHours = 24 - currentHour;
    const relTime = diffHours <= 1 
      ? `Hace ${Math.max(10, 60 - currentMinute)} min` 
      : diffHours === 2 
        ? `Hace 2 horas` 
        : `Hace ${diffHours} horas`;

    let details = '';
    if (category.module === 'Foliador') {
      const folioNum = String(100 - (i % 60)).padStart(4, '0');
      details = `Folio correlativo: OFI-2026-${folioNum} • Archivo procesado con validación criptográfica`;
    } else if (category.module === 'Buzón SAT') {
      details = `Acuse SAT #${100000 + i * 29} emitido bajo el Art. 134 del CFF`;
    } else if (category.module === 'Expedientes RFC') {
      details = `Expediente contribuyente validado en padrón de contribuyentes activos`;
    } else if (category.module === 'Contabilidad') {
      details = `Póliza P-${202600 + i} cuadre certificado: $${(15420 + i * 85).toLocaleString('es-MX')}.00`;
    } else if (category.module === 'Bancos') {
      details = `Referencia bancaria REF-${900000 + i * 13} validada con éxito`;
    } else {
      details = `Registro verificado conforme a los estándares de control interno de PazSuma`;
    }

    const status: 'completado' | 'advertencia' | 'critico' = (i === 17 || i === 43 || i === 89)
      ? 'advertencia'
      : 'completado';

    list.push({
      id: `log-${i}`,
      user: userObj.name,
      email: userObj.email,
      date: dateFormatted,
      relativeTime: relTime,
      module: category.module,
      action: actionText,
      details,
      ip: userObj.ip,
      status
    });
  }

  return list;
}
