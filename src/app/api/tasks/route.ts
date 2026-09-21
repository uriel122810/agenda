import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

// ID de proyecto institucional por defecto
const DEFAULT_PROJECT_ID = 'dfb04b22-0c6f-4834-8de4-76173ea6b814';

// Tareas iniciales por defecto si la tabla está vacía
const INITIAL_DEMO_TASKS = [
  {
    title: 'Presentar Declaración Mensual de IVA e ISR',
    description: 'Verificar conciliación bancaria y pólizas de egresos antes de enviar al SAT.',
    status: 'pendiente',
    priority: 'alta',
    due_date: new Date(Date.now() + 4 * 86400000).toISOString()
  },
  {
    title: 'Descargar comprobantes CFDI 4.0 del mes',
    description: 'Ejecutar sincronizador de buzón SAT para facturas de clientes con retenciones.',
    status: 'en_proceso',
    priority: 'media',
    due_date: new Date(Date.now() + 2 * 86400000).toISOString()
  },
  {
    title: 'Renovar Certificado de Sello Digital (CSD)',
    description: 'El sello vence a fin de mes. Solicitar e.firma vigente al contribuyente.',
    status: 'en_proceso',
    priority: 'alta',
    due_date: new Date(Date.now() + 1 * 86400000).toISOString()
  },
  {
    title: 'Foliar libros contables y actas de asamblea',
    description: 'Estampar folios consecutivos del 001 al 250 en actas digitalizadas con membrete.',
    status: 'completada',
    priority: 'baja',
    due_date: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    title: 'Cierre anual de ejercicio fiscal 2025',
    description: 'Auditoría interna completada y papeles de trabajo archivados.',
    status: 'completada',
    priority: 'baja',
    due_date: new Date(Date.now() - 30 * 86400000).toISOString()
  }
];

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Obtener tareas existentes
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al consultar tasks en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si la tabla está vacía, sembrar las tareas iniciales en Supabase
    if (!data || data.length === 0) {
      // Verificar si existe el proyecto por defecto
      let projectId = DEFAULT_PROJECT_ID;
      const { data: projData } = await supabase.from('projects').select('id').limit(1);
      if (projData && projData.length > 0) {
        projectId = projData[0].id;
      }

      const tasksToInsert = INITIAL_DEMO_TASKS.map(t => ({
        project_id: projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        due_date: t.due_date
      }));

      const { data: seeded, error: seedError } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (!seedError && seeded) {
        return NextResponse.json({ tasks: seeded, seeded: true });
      }
    }

    return NextResponse.json({ tasks: data });
  } catch (err: any) {
    console.error('Excepción en GET /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, status = 'pendiente', priority = 'media', due_date, column_name } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'El título de la tarea es requerido' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Obtener un project_id válido
    let projectId = DEFAULT_PROJECT_ID;
    const { data: projData } = await supabase.from('projects').select('id').limit(1);
    if (projData && projData.length > 0) {
      projectId = projData[0].id;
    }

    // Mapear status seguro
    const validStatus = ['pendiente', 'en_proceso', 'completada', 'archivada'].includes(status)
      ? status
      : 'pendiente';

    // Mapear prioridad segura
    const validPriority = ['alta', 'media', 'baja', 'urgente'].includes(priority)
      ? priority
      : 'media';

    // Parsear fecha
    let validDueDate: string | null = null;
    if (due_date) {
      try {
        validDueDate = new Date(due_date).toISOString();
      } catch {
        validDueDate = null;
      }
    }

    // Columna kanban por defecto
    const validColumnName = column_name || (
      validStatus === 'en_proceso' ? 'En proceso' :
      validStatus === 'completada' ? 'Hecho' :
      validStatus === 'archivada' ? 'Archivados' : 'Pendiente'
    );

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: title.trim(),
        description: description ? description.trim() : null,
        status: validStatus,
        priority: validPriority,
        column_name: validColumnName,
        due_date: validDueDate
      })
      .select();

    if (error) {
      console.error('Error insertando tarea en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data[0] }, { status: 201 });
  } catch (err: any) {
    console.error('Excepción en POST /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error al crear tarea' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, description, status, priority, due_date, column_name } = body;

    if (!id) {
      return NextResponse.json({ error: 'El ID de la tarea es requerido' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (status !== undefined) {
      updates.status = ['pendiente', 'en_proceso', 'completada', 'archivada'].includes(status)
        ? status
        : 'pendiente';
    }
    if (priority !== undefined) {
      updates.priority = ['alta', 'media', 'baja', 'urgente'].includes(priority)
        ? priority
        : 'media';
    }
    if (due_date !== undefined) {
      updates.due_date = due_date ? new Date(due_date).toISOString() : null;
    }
    if (column_name !== undefined) {
      updates.column_name = column_name;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error actualizando tarea en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task: data[0] });
  } catch (err: any) {
    console.error('Excepción en PATCH /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error al actualizar tarea' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID de la tarea es requerido' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando tarea en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Excepción en DELETE /api/tasks:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar tarea' }, { status: 500 });
  }
}
