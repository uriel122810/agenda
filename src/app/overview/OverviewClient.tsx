'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  CheckCircle2, CalendarDays, Search, UserCircle,
  Clock, LogOut, Plus, LayoutDashboard, Book,
  Users, Mail, ChevronRight, Settings, ChevronDown,
  Sun, Moon, Paperclip, Send, Loader2, X,
  ChevronLeft, Shield, Trash2, UserPlus, Globe, Lock,
  Bell, FileText, Image as ImageIcon, UploadCloud
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
type ChecklistStatus  = 'pendiente' | 'en_progreso' | 'completado';
type UserRole         = 'administrador' | 'empleado';
type Visibility       = 'personal' | 'compartido' | 'global';

interface Checklist {
  id: string;
  titulo: string;
  descripcion: string | null;
  estatus: ChecklistStatus;
  creador_email: string;
  compartido_con: string[];
  visibilidad: Visibility | null;
  fecha_limite: string | null;
  creado_en: string;
}

interface AgendaEvent {
  id: string;
  fecha_hora: string;
  titulo: string;
  descripcion: string | null;
  creador_email: string;
  visibilidad?: Visibility | null;
  compartido_con?: string[];
  isExternal?: boolean;
}

interface ContactUser {
  id?: string;
  name: string | null;
  email: string | null;
  role?: UserRole;
}

interface Project {
  id: string;
  title: string;
  customer: string;
  status: string;
  budget_type: string;
  billing_method: string;
  start_date: string | null;
  end_date: string | null;
  estimated_delivery?: string;
  original_delivery?: string;
  visibility: Visibility;
  creador_email: string;
  compartido_con: string[];
  creado_en: string;
}

interface ProjectDelay {
  id: string;
  project_id: string;
  old_date: string;
  new_date: string;
  reason?: string;
  created_at: string;
}

interface PipelineTask {
  id: string;
  project_id: string;
  column_name: string;
  title: string;
  description: string | null;
  assignee_email: string | null;
  status: string;
  due_date: string | null;
  priority: string;
  creador_email: string;
  creado_en: string;
}

interface PipelineComment {
  id: string;
  task_id: string;
  user_email: string;
  content: string;
  creado_en: string;
}

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  pendiente:  'Pendiente',
  en_progreso:'Trabajando',
  completado: 'Completado',
};
const STATUS_OPTIONS: ChecklistStatus[] = ['pendiente', 'en_progreso', 'completado'];
const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Theme Tokens ─────────────────────────────────────────────────────────────
const LIGHT = {
  bg: 'bg-[#f4f1ea]', text: 'text-slate-800',
  sidebarBg: 'bg-slate-900',
  headerBg: 'bg-white', headerBorder: 'border-slate-200',
  cardBg: 'bg-white', cardBorder: 'border-slate-200',
  mutedText: 'text-slate-500', searchBg: 'bg-slate-100',
  calCell: 'bg-white', calOther: 'bg-slate-50',
  calHdr: 'bg-[#f9f9f9]', calHover: 'hover:bg-amber-50',
  tableTh: 'bg-[#f4f1ea]', tableHover: 'hover:bg-[#f4f1ea]',
};
const DARK = {
  bg: 'bg-slate-950', text: 'text-slate-100',
  sidebarBg: 'bg-slate-950',
  headerBg: 'bg-slate-900', headerBorder: 'border-slate-800',
  cardBg: 'bg-slate-900', cardBorder: 'border-slate-800',
  mutedText: 'text-slate-400', searchBg: 'bg-slate-800',
  calCell: 'bg-slate-900', calOther: 'bg-slate-950/70',
  calHdr: 'bg-slate-800', calHover: 'hover:bg-slate-800/60',
  tableTh: 'bg-slate-800', tableHover: 'hover:bg-slate-800/50',
};

const INPUT = 'w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-black placeholder-slate-400 focus:outline-none focus:border-[#581c2f] focus:ring-1 focus:ring-[#581c2f] transition-all';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  user: any;
  userRole: UserRole;
  userName: string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function OverviewClient({ user, userRole, userName }: Props) {
  const router   = useRouter();
  const supabase = createSupabaseBrowserClient();
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'administrador';
  const userEmail = user?.email;

  // ── UI
  const [isDark, setIsDark] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen]   = useState(false);
  const [isDropdownOpen, setIsDropdownOpen]   = useState(false);
  const [isNotebookOpen, setIsNotebookOpen]   = useState(false);
  const [currentView, setCurrentView]         = useState('pipelines');
  const [notificationCount, setNotificationCount] = useState(0);

  // ── Modals
  const [isEventModalOpen,      setIsEventModalOpen]      = useState(false);
  const [isProjectModalOpen,    setIsProjectModalOpen]    = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isShareModalOpen,      setIsShareModalOpen]      = useState(false);
  const [isShareEventModalOpen, setIsShareEventModalOpen] = useState(false);
  
  // ── Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'checklist' | 'agenda', title: string } | null>(null);

  // ── Data
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [agenda,     setAgenda]     = useState<AgendaEvent[]>([]);
  const [contacts,   setContacts]   = useState<ContactUser[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // ── Event Form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate,  setEventDate]  = useState('');
  const [eventType,  setEventType]  = useState('Reunión');
  const [eventGuests, setEventGuests] = useState('');
  const [showGuests,  setShowGuests]  = useState(false);
  const [eventVisibility, setEventVisibility] = useState<Visibility>('personal');
  const [eventShareEmail, setEventShareEmail] = useState<string>(''); // Seleccionado
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  
  const [eventToShare, setEventToShare] = useState<AgendaEvent | null>(null);

  // ── Project Form & Share Form
  const [projectTitle,      setProjectTitle]      = useState('');
  const [projectDesc,       setProjectDesc]       = useState('');
  const [projectVisibility, setProjectVisibility] = useState<Visibility>('personal');
  const [shareWithEmail,    setShareWithEmail]    = useState<string>(''); // Seleccionado
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  
  const [projectToShare, setProjectToShare] = useState<Checklist | null>(null);

  // ── Contact Form (admin only)
  const [contactEmail, setContactEmail] = useState('');
  const [contactName,  setContactName]  = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // ── Email Composer (Mensajes)
  const [emailTo,      setEmailTo]      = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailFiles,   setEmailFiles]   = useState<File[]>([]);
  const [emailStatus,  setEmailStatus]  = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError,   setEmailError]   = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── IA Dashboard State
  const [aiData, setAiData] = useState<{ resumenEjecutivo: string, datosGraficos: any[] } | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // ── Pipelines State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [pipelineTasks, setPipelineTasks] = useState<PipelineTask[]>([]);
  const [activeProjectDelays, setActiveProjectDelays] = useState<ProjectDelay[]>([]);
  const [activeTask, setActiveTask] = useState<PipelineTask | null>(null);
  const [comments, setComments] = useState<PipelineComment[]>([]);
  
  // ── Pipelines Modals & Forms
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ title: '', customer: '', status: 'Active', budget_type: '', billing_method: '', estimated_delivery: '' });
  
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [addTaskColumn, setAddTaskColumn] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const [newComment, setNewComment] = useState('');

  // ── Calendar navigation
  const [calYear,  setCalYear]  = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const t = isDark ? DARK : LIGHT;

  // ─── Outside click handler ────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ─── Gmail Redirection ─────────────────────────────────────────────────────
  const handleOpenGmail = () => {
    setNotificationCount(0);
    if (userEmail) {
      window.open(`https://mail.google.com/mail/u/?authuser=${encodeURIComponent(userEmail)}`, '_blank');
    } else {
      window.open('https://mail.google.com', '_blank');
    }
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setIsLoadingContacts(true);
    try {
      const { data, error } = await supabase.from('users').select('name, email');
      if (error) throw error;
      if (data) {
        setContacts(data as ContactUser[]);
      }
    } catch (err) {
      console.error("Error al cargar contactos:", err);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [supabase]);

  const fetchChecklists = useCallback(async () => {
    if (!userEmail) return;
    const { data } = await supabase
      .from('checklists')
      .select('*')
      .order('creado_en', { ascending: false });

    if (data) {
      // Filtrar a nivel de JS como lo solicitó el usuario y actualizar estado
      const proyectosFiltrados = data.filter(item => 
        item.creador_email === userEmail || 
        item.visibilidad === 'global' || 
        (item.compartido_con && item.compartido_con.includes(userEmail))
      );
      setChecklists(proyectosFiltrados as Checklist[]);
    }
  }, [supabase, userEmail]);

  const fetchAgenda = useCallback(async () => {
    if (!userEmail) return;
    
    // 1. Fetch from Supabase (Local)
    const { data: localData } = await supabase
      .from('agenda')
      .select('*')
      .order('fecha_hora', { ascending: true });
      
    // Filter local data immediately to match the user's logic requirements
    const localFiltered = (localData || []).filter(item => 
      item.creador_email === userEmail || 
      item.visibilidad === 'global' || 
      (item.compartido_con && item.compartido_con.includes(userEmail))
    ) as AgendaEvent[];

    // 2. Fetch from Google Calendar (External)
    let externalData: AgendaEvent[] = [];
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const { items } = await res.json();
        if (items) {
          externalData = items.map((item: any) => ({
            id: item.id,
            fecha_hora: item.start.dateTime || item.start.date,
            titulo: item.summary || 'Evento Externo',
            descripcion: item.description || null,
            creador_email: 'external',
            isExternal: true,
            visibilidad: 'personal'
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching external calendar events', e);
    }

    const combined = [...localFiltered, ...externalData].sort(
      (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
    );

    setAgenda(combined);
  }, [supabase, userEmail]);

  // ── Pipelines Fetchers
  const fetchProjects = useCallback(async () => {
    if (!userEmail) return;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al cargar proyectos:', error);
      return;
    }

    if (data) {
      const mapped = data.map((proj: any) => ({
        ...proj,
        title: proj.title || proj.name || 'Sin título',
        creado_en: proj.created_at || proj.creado_en,
        creador_email: proj.creador_email || userEmail,
        visibility: proj.visibility || 'Public',
      }));
      setProjects(mapped as Project[]);
    }
  }, [supabase, userEmail]);

  const fetchPipelineTasks = useCallback(async (projectId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al cargar tareas:', error);
      return;
    }

    if (data) {
      const mapped = data.map((t: any) => ({
        ...t,
        assignee_email: t.assignee_email || null,
        creado_en: t.created_at || t.creado_en,
      }));
      setPipelineTasks(mapped as PipelineTask[]);
    }
  }, [supabase]);

  const fetchComments = useCallback(async (taskId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al cargar comentarios:', error);
      return;
    }

    if (data) {
      const mapped = data.map((c: any) => ({
        ...c,
        user_email: c.user_email || userName || userEmail || 'Usuario',
        creado_en: c.created_at || c.creado_en,
      }));
      setComments(mapped as PipelineComment[]);
    }
  }, [supabase, userName, userEmail]);

  const fetchProjectDelays = useCallback(async (projectId: string) => {
    const { data, error } = await supabase
      .from('project_delay_history')
      .select('*')
      .eq('project_id', projectId)
      .order('changed_at', { ascending: true });
    
    if (error) {
      console.error('Error al cargar historial de retrasos:', error);
      return;
    }

    if (data) {
      const mapped = data.map((d: any) => ({
        ...d,
        old_date: d.old_date || d.previous_date,
        created_at: d.changed_at || d.created_at,
      }));
      setActiveProjectDelays(mapped as ProjectDelay[]);
    }
  }, [supabase]);

  useEffect(() => {
    if (currentView === 'dashboards' && activeProject) {
      fetchProjectDelays(activeProject.id);
    }
  }, [currentView, activeProject, fetchProjectDelays]);

  useEffect(() => {
    fetchContacts();
    fetchChecklists();
    fetchAgenda();
    fetchProjects();

    // Supabase Realtime for instant synchronization across clients
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, (payload) => {
        fetchChecklists();
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newRecord = payload.new as any;
          if (
            newRecord.creador_email !== userEmail &&
            (newRecord.visibilidad === 'global' ||
              (newRecord.compartido_con && newRecord.compartido_con.includes(userEmail)))
          ) {
            setNotificationCount((prev) => prev + 1);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda' }, (payload) => {
        fetchAgenda();
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newRecord = payload.new as any;
          if (
            newRecord.creador_email !== userEmail &&
            (newRecord.visibilidad === 'global' ||
              (newRecord.compartido_con && newRecord.compartido_con.includes(userEmail)))
          ) {
            setNotificationCount((prev) => prev + 1);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchProjects())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (activeProject) fetchPipelineTasks(activeProject.id);
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newRecord = payload.new as any;
          // Reverse Notification Fix for tasks
          if (newRecord.creador_email !== userEmail) {
            setNotificationCount((prev) => prev + 1);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        if (activeTask) fetchComments(activeTask.id);
        if (payload.eventType === 'INSERT') {
          const newRecord = payload.new as any;
          // Reverse Notification Fix for comments
          if (newRecord.user_email !== userEmail) {
            setNotificationCount((prev) => prev + 1);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContacts, fetchChecklists, fetchAgenda, fetchProjects, fetchPipelineTasks, fetchComments, activeProject, activeTask, supabase, userEmail]);

  // ─── Pipelines Functions ──────────────────────────────────────────────────
  const handleAddProjectPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.title.trim() || !newProjectData.customer.trim() || !newProjectData.estimated_delivery) {
      alert("Por favor completa los campos requeridos incluyendo Fecha Estimada.");
      return;
    }

    const payload = {
      name: newProjectData.title.trim(),
      customer: newProjectData.customer.trim(),
      status: newProjectData.status || 'Active',
      budget_type: newProjectData.budget_type || null,
      billing_method: newProjectData.billing_method || null,
      estimated_delivery: newProjectData.estimated_delivery,
      original_delivery: newProjectData.estimated_delivery,
      created_by: user?.id || null,
      visibility: 'Public'
    };

    const { error } = await supabase.from('projects').insert([payload]);
    if (error) {
      console.error('Error al crear proyecto:', error);
      alert('Error al crear proyecto: ' + error.message);
    } else {
      setIsAddProjectModalOpen(false);
      setNewProjectData({ title: '', customer: '', status: 'Active', budget_type: '', billing_method: '', estimated_delivery: '' });
      fetchProjects();
    }
  };

  const handleUpdateProjectDelivery = async (projectId: string, oldDate: string, newDate: string) => {
    if (!newDate || oldDate === newDate) return;
    
    // Update project
    const { error: updateError } = await supabase.from('projects').update({ estimated_delivery: newDate }).eq('id', projectId);
    if (updateError) {
      console.error('Error actualizando fecha:', updateError);
      alert("Error al actualizar la fecha del proyecto.");
      return;
    }
    
    // Log delay
    const { error: logError } = await supabase.from('project_delay_history').insert([{
      project_id: projectId,
      previous_date: oldDate,
      new_date: newDate,
      changed_by: user?.id || null
    }]);
    
    if (logError) {
      console.warn("Aviso: No se pudo registrar el historial de retraso.", logError);
    }
    
    fetchProjects();
    fetchProjectDelays(projectId);
    if (activeProject && activeProject.id === projectId) {
      setActiveProject({ ...activeProject, estimated_delivery: newDate });
    }
  };


  const handleAddTaskPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;

    const payload = {
      project_id: activeProject.id,
      column_name: addTaskColumn,
      title: newTaskTitle.trim(),
      status: 'pending',
      priority: 'Medium'
    };

    const { error } = await supabase.from('tasks').insert([payload]);
    if (error) {
      console.error('Error al crear tarea:', error);
      alert('Error al crear tarea: ' + error.message);
    } else {
      setIsAddTaskModalOpen(false);
      setNewTaskTitle('');
      fetchPipelineTasks(activeProject.id);
    }
  };

  const handleUpdateTaskPipeline = async (taskId: string, updates: Partial<PipelineTask>) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
    if (error) {
      console.error('Error al actualizar tarea:', error);
      alert('Error al actualizar tarea: ' + error.message);
    } else {
      if (activeProject) fetchPipelineTasks(activeProject.id);
      if (activeTask) setActiveTask(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleAddCommentPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTask) return;

    const payload = {
      task_id: activeTask.id,
      user_id: user?.id || null,
      content: newComment.trim()
    };

    const { error } = await supabase.from('comments').insert([payload]);
    if (error) {
      console.error('Error al enviar comentario:', error);
      alert('Error al enviar comentario: ' + error.message);
    } else {
      setNewComment('');
      fetchComments(activeTask.id);
    }
  };

  const handleAIAssistant = async (texto: string, accion: string, onResult: (res: string) => void) => {
    try {
      const payloadText = `Acción solicitada: ${accion}\n\nTexto original u orden:\n${texto}\n\nInstrucción estricta: Ignora que eres un analizador de minutas si la acción es diferente. Usa la clave "resumenEjecutivo" del JSON para devolver la respuesta a esta solicitud.`;
      const { data, error } = await supabase.functions.invoke('procesar-ia', {
        body: { text: payloadText }
      });
      if (error) throw error;
      if (data && data.resumenEjecutivo) {
        onResult(data.resumenEjecutivo);
      } else {
        alert('Respuesta de IA vacía o incorrecta.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de IA');
    }
  };

  // ─── Checklists ───────────────────────────────────────────────────────────
  const handleUpdateStatus = async (id: string, newStatus: ChecklistStatus) => {
    setChecklists(prev => prev.map(c => c.id === id ? { ...c, estatus: newStatus } : c));
    const { error } = await supabase.from('checklists').update({ estatus: newStatus }).eq('id', id);
    if (error) { console.error(error); fetchChecklists(); }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;

    if (!userEmail) {
      alert('No se detectó una sesión activa.');
      return;
    }

    const payload = {
      titulo: projectTitle,
      descripcion: projectDesc || "",
      creador_email: userEmail,
      visibilidad: projectVisibility,
      compartido_con: projectVisibility === 'compartido' && shareWithEmail ? [shareWithEmail] : [],
      estatus: 'pendiente'
    };

    setIsSubmittingProject(true);
    try {
      const { data, error } = await supabase
        .from('checklists')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("Error completo de Supabase:", error);
        alert("Error al crear proyecto: " + error.message);
        return;
      }
      
      if (data) {
        setChecklists(prev => [data as Checklist, ...prev]);
        setIsProjectModalOpen(false);
        resetProjectForm();
      }
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleUpdateProjectVisibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToShare || !userEmail) return;
    setIsSubmittingProject(true);
    try {
      const { error } = await supabase.from('checklists').update({
        visibilidad: projectVisibility,
        compartido_con: projectVisibility === 'compartido' && shareWithEmail ? [shareWithEmail] : [],
      }).eq('id', projectToShare.id);

      if (error) throw error;

      await fetchChecklists();
      setIsShareModalOpen(false);
      setProjectToShare(null);
      resetProjectForm();
    } catch (err: any) {
      alert(`Error al actualizar privacidad: ${err.message}`);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const openShareModal = (project: Checklist) => {
    setProjectToShare(project);
    setProjectVisibility(project.visibilidad || 'personal');
    setShareWithEmail((project.compartido_con && project.compartido_con[0]) || '');
    setIsShareModalOpen(true);
  };

  const resetProjectForm = () => {
    setProjectTitle(''); setProjectDesc('');
    setProjectVisibility('personal'); setShareWithEmail('');
  };

  // ─── Agenda ───────────────────────────────────────────────────────────────
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) { alert('Sesión inválida. Vuelve a iniciar sesión.'); return; }
    setIsSubmittingEvent(true);
    try {
      const descParts = [`Tipo: ${eventType}`];
      if (showGuests && eventGuests.trim()) descParts.push(`Invitados: ${eventGuests.trim()}`);
      
      const fullDesc = descParts.join(' | ');
      const isoDate = new Date(eventDate).toISOString();

      const payload = {
        titulo:         eventTitle,
        descripcion:    fullDesc,
        fecha_hora:     isoDate,
        creador_email:  userEmail,
        visibilidad:    eventVisibility,
        compartido_con: eventVisibility === 'compartido' && eventShareEmail ? [eventShareEmail] : [],
      };

      // 1. Guardar en Supabase local
      const { data, error } = await supabase.from('agenda').insert([payload]).select().single();
      if (error) throw error;
      
      if (data) setAgenda(prev => [...prev, data as AgendaEvent]);

      // 2. Guardar en Google Calendar (External API Sync)
      try {
         await fetch('/api/calendar', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             summary: eventTitle,
             description: fullDesc,
             startDateTime: isoDate,
             endDateTime: new Date(new Date(eventDate).getTime() + 60 * 60 * 1000).toISOString()
           })
         });
      } catch(gError) {
         console.warn('Could not sync to Google Calendar', gError);
      }

      closeEventModal();
    } catch (err: any) {
      alert(`Error al crear evento: ${err.message}`);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleUpdateEventVisibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToShare || !userEmail) return;
    setIsSubmittingEvent(true);
    try {
      const { error } = await supabase.from('agenda').update({
        visibilidad: eventVisibility,
        compartido_con: eventVisibility === 'compartido' && eventShareEmail ? [eventShareEmail] : [],
      }).eq('id', eventToShare.id);

      if (error) throw error;

      await fetchAgenda();
      setIsShareEventModalOpen(false);
      setEventToShare(null);
      setEventVisibility('personal');
      setEventShareEmail('');
    } catch (err: any) {
      alert(`Error al actualizar privacidad del evento: ${err.message}`);
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const openShareEventModal = (event: AgendaEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.isExternal) return; // Cannot update privacy of external google events here
    
    setEventToShare(event);
    setEventVisibility(event.visibilidad || 'personal');
    setEventShareEmail((event.compartido_con && event.compartido_con[0]) || '');
    setIsShareEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setEventTitle(''); setEventDate(''); setEventType('Reunión');
    setEventGuests(''); setShowGuests(false);
    setEventVisibility('personal'); setEventShareEmail('');
  };

  // ─── Deletion Logic ───────────────────────────────────────────────────────
  const openDeleteModal = (id: string, type: 'checklist' | 'agenda', title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete({ id, type, title });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    
    try {
      if (type === 'checklist') {
        setChecklists(prev => prev.filter(c => c.id !== id));
        const { error } = await supabase.from('checklists').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'agenda') {
        setAgenda(prev => prev.filter(a => a.id !== id));
        const { error } = await supabase.from('agenda').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
      if (type === 'checklist') fetchChecklists();
      if (type === 'agenda') fetchAgenda();
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // ─── Contacts (Admin only) ────────────────────────────────────────────────
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setIsSubmittingContact(true);
    try {
      const { error } = await supabase.from('users').insert({
        id:    crypto.randomUUID(),
        name:  contactName,
        email: contactEmail,
        role:  'empleado',
      });
      if (error) throw error;
      await fetchContacts();
      setIsAddContactModalOpen(false);
      setContactEmail(''); setContactName('');
    } catch (err: any) {
      alert(`Error al agregar contacto: ${err.message}`);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Eliminar este contacto del sistema?')) return;
    await supabase.from('users').delete().eq('id', id);
    await fetchContacts();
  };

  // ─── Email — Attachments & Send (FormData) ────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEmailFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const removeFile = (indexToRemove: number) => {
    setEmailFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailSubject.trim() || !emailMessage.trim()) {
      setEmailError('Completa todos los campos requeridos.');
      setEmailStatus('error');
      return;
    }
    setEmailStatus('sending');
    setEmailError('');
    setUploadProgress(0);

    try {
      if (emailFiles.length > 0) {
        for (let i = 1; i <= 10; i++) {
          await new Promise(r => setTimeout(r, 80));
          setUploadProgress(i * 10);
        }
      }

      const messageHtml = `<div style="font-family:sans-serif;line-height:1.6">${emailMessage.replace(/\n/g, '<br/>')}</div>`;

      const formData = new FormData();
      const recipients = emailTo.split(',').map(s => s.trim()).filter(Boolean);
      recipients.forEach(r => formData.append('to', r));
      formData.append('subject', emailSubject);
      formData.append('message', messageHtml);
      emailFiles.forEach(file => formData.append('attachments', file));

      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Error al enviar (backend rechazo)');
      }

      setEmailStatus('sent');
      // Incrementar notificación visual de éxito
      setNotificationCount(prev => prev + 1);

      setTimeout(() => {
        setEmailTo(''); setEmailSubject(''); setEmailMessage('');
        setEmailFiles([]); setEmailStatus('idle'); setUploadProgress(0);
      }, 3000);
    } catch (err: any) {
      setEmailError(err.message);
      setEmailStatus('error');
    }
  };

  const handleUploadAndProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAI(true);
    setAiError('');
    setAiData(null);

    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('reuniones-y-trabajos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: fnData, error: fnError } = await supabase.functions.invoke('procesar-ia', {
        body: { storagePath: fileName }
      });

      if (fnError) throw fnError;
      
      if (fnData && fnData.resumenEjecutivo && fnData.datosGraficos) {
        setAiData(fnData);
      } else {
        throw new Error('Formato de respuesta inválido de la IA');
      }

    } catch (error: any) {
      console.error('Error al procesar IA:', error);
      setAiError(error.message || 'Ocurrió un error al procesar el archivo.');
    } finally {
      setIsProcessingAI(false);
      e.target.value = ''; // Reset file input
    }
  };

  // ─── Calendar Grid ────────────────────────────────────────────────────────
  const buildCalendar = () => {
    const firstDay   = new Date(calYear, calMonth, 1).getDay();
    const offset     = firstDay === 0 ? 6 : firstDay - 1; // Mon-first grid
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++)       cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(calYear, calMonth, d));
    const rem = (Math.ceil(cells.length / 7) * 7) - cells.length;
    for (let i = 0; i < rem; i++)          cells.push(null);
    return cells;
  };

  const eventsOnDay = (date: Date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    // Now filtering agenda local array directly since it's already properly populated
    return agenda.filter(ev => ev.fecha_hora.startsWith(key));
  };

  const handleDayClick = (date: Date) => {
    const off = date.getTimezoneOffset() * 60000;
    setEventDate(new Date(date.getTime() - off).toISOString().slice(0, 16));
    setIsEventModalOpen(true);
  };

  const monthLabel = new Date(calYear, calMonth).toLocaleString('es-MX', { month: 'long', year: 'numeric' });

  // ─── Kanban Column ────────────────────────────────────────────────────────
  const KanbanColumn = ({ status, accent }: { status: ChecklistStatus; accent: string }) => {
    // We filter checklists directly, since fetchChecklists filters state upfront!
    const items = checklists.filter(c => c.estatus === status);
    return (
      <div className={`${t.cardBg} border ${t.cardBorder} border-t-[3px] ${accent} rounded-xl shadow-sm flex-1 flex flex-col min-w-[256px]`}>
        <div className={`px-4 py-3 border-b ${t.cardBorder} flex justify-between items-center`}>
          <span className="font-bold text-xs uppercase tracking-widest text-[#6b1c35]">{STATUS_LABELS[status]}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{items.length}</span>
        </div>
        <div className="p-3 flex-1 space-y-3 overflow-y-auto min-h-[280px]">
          {items.map(item => {
            const isOwn    = item.creador_email === userEmail;
            const isGlobal = item.visibilidad === 'global';
            const isShared = item.visibilidad === 'compartido';
            const canManage = isOwn || isAdmin;
            
            return (
              <div key={item.id} className={`${t.cardBg} border ${t.cardBorder} rounded-lg p-4 hover:border-[#b39656] transition-all relative group`}>
                <div className="flex items-start justify-between gap-2 mb-2 pr-12">
                  <p className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.titulo}</p>
                </div>
                {item.descripcion && <p className={`text-xs mb-3 ${t.mutedText}`}>{item.descripcion}</p>}
                
                <div className="flex items-center justify-between mt-3">
                  <select
                    value={item.estatus}
                    onChange={e => handleUpdateStatus(item.id, e.target.value as ChecklistStatus)}
                    disabled={!canManage && !isGlobal && !isShared}
                    className={`text-xs font-bold px-2 py-1.5 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#581c2f] disabled:opacity-50 disabled:cursor-not-allowed ${
                      item.estatus === 'completado' ? 'bg-[#6b1c35]/10 border-[#6b1c35]/20 text-[#6b1c35]'
                      : item.estatus === 'en_progreso' ? 'bg-[#b39656]/10 border-[#b39656]/20 text-[#b39656]'
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  
                  {/* Share button */}
                  {canManage && (
                    <button 
                      onClick={() => openShareModal(item)}
                      title="Gestionar Privacidad"
                      className="absolute top-3 right-8 p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-400 hover:text-[#b39656]"
                    >
                      {isGlobal ? <Globe size={15} className="text-[#b39656]" /> : 
                       isShared ? <Users size={15} className="text-[#b39656]" /> : 
                       <Lock size={15} />}
                    </button>
                  )}
                  
                  {/* Delete button */}
                  {canManage && (
                    <button 
                      onClick={(e) => openDeleteModal(item.id, 'checklist', item.titulo, e)}
                      title="Eliminar Proyecto"
                      className="absolute top-3 right-2 p-1.5 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors text-slate-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}

                  {!canManage && (
                     <div className="absolute top-3 right-3 text-slate-400" title={isGlobal ? 'Global' : 'Compartido'}>
                       {isGlobal ? <Globe size={15} /> : <Users size={15} />}
                     </div>
                  )}

                  {item.fecha_limite && (
                    <span className={`flex items-center gap-1 text-[11px] ${t.mutedText}`}>
                      <Clock size={11} />{new Date(item.fecha_limite).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className={`text-center py-8 text-xs font-medium ${t.mutedText} border-2 border-dashed ${t.cardBorder} rounded-lg`}>Sin elementos</div>
          )}
        </div>
      </div>
    );
  };

  // ─── Componentes Compartidos (Selectors) ──────────────────────────────────
  const ContactsSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const availableContacts = contacts.filter(c => c.email !== userEmail && c.email);
    
    if (isLoadingContacts) {
      return <div className={INPUT + " text-slate-400 bg-slate-50 flex items-center"}><Loader2 size={14} className="animate-spin mr-2" /> Buscando...</div>;
    }

    if (contacts.length === 0 || availableContacts.length === 0) {
      return (
        <div>
          <input 
            type="email" 
            value={value} 
            onChange={e => onChange(e.target.value)} 
            placeholder="correo@municipio.gob.mx" 
            className={INPUT} 
            required 
          />
          <p className="text-[10px] text-amber-600 mt-1">Escribe el correo manualmente (Directorio vacío).</p>
        </div>
      );
    }

    return (
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className={INPUT}
        required
      >
        <option value="" disabled>-- Selecciona un contacto --</option>
        {availableContacts.map(c => (
          <option key={c.email!} value={c.email!}>
            {c.name || 'Sin Nombre'} ({c.email})
          </option>
        ))}
      </select>
    );
  };

  // ─── Navigation ─────────────────────────────────────────────
  const NAV = [
    { id: 'pipelines',   label: 'Pipelines',  icon: CheckCircle2    },
    { id: 'contactos',   label: 'Contactos',  icon: Users           },
    { id: 'actividades', label: 'Actividades',icon: CalendarDays    },
    { id: 'dashboards',  label: 'Dashboards', icon: LayoutDashboard },
    { id: 'mensajes',    label: 'Mensajes',   icon: Mail            },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className={`flex min-h-screen ${t.bg} ${t.text} font-sans`} style={{ fontFamily: 'var(--font-inter, sans-serif)' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={`w-64 ${t.sidebarBg} flex-shrink-0 hidden md:flex flex-col border-r border-slate-800`}>
        <div className="px-6 py-6 border-b border-white/5">
          <span className="text-white font-extrabold text-2xl tracking-tight">PazSuma</span>
          <p className="text-[#b39656] text-[10px] mt-1.5 tracking-widest uppercase font-bold">Sistema Institucional</p>
        </div>
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = currentView === item.id;
            return (
              <button key={item.id} onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all group relative ${
                  active ? 'bg-[#6b1c35] text-white shadow-md shadow-[#6b1c35]/20'
                         : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={17} className={`flex-shrink-0 ${active ? 'text-[#b39656]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && item.id !== 'mensajes' && <ChevronRight size={13} className="text-[#b39656]" />}
              </button>
            );
          })}
        </nav>
        {/* Role badge */}
        <div className="px-5 py-4 border-t border-white/5">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isAdmin ? 'bg-[#6b1c35]/20' : 'bg-white/5'}`}>
            <Shield size={14} className={isAdmin ? 'text-[#b39656]' : 'text-slate-500'} />
            <span className={`text-xs font-bold capitalize ${isAdmin ? 'text-[#b39656]' : 'text-slate-500'}`}>{userRole}</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className={`flex-shrink-0 ${t.headerBg} border-b ${t.headerBorder} shadow-sm z-20`}>
          <div className="px-6 h-16 flex items-center justify-between">
            <div className={`flex items-center gap-2 ${t.searchBg} px-4 py-2 rounded-lg border ${t.headerBorder} focus-within:border-[#b39656] transition-all`}>
              <Search size={16} className={t.mutedText} />
              <input type="text" placeholder="Buscar..." className={`bg-transparent border-none text-sm focus:outline-none ${t.text} w-44 placeholder-slate-400`} />
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsNotebookOpen(true)}
                title="Abrir Libreta de Notas"
                className={`relative p-2 rounded-lg transition-colors ${t.mutedText} hover:text-[#6b1c35] ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                <Book size={20} />
              </button>

              {/* Notification Bell -> Redirects to Gmail & Shows Badge */}
              <button 
                onClick={handleOpenGmail}
                title="Abrir Bandeja de Gmail"
                className={`relative p-2 rounded-lg transition-colors ${t.mutedText} hover:text-[#6b1c35] ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* ⚙ Settings Dropdown */}
              <div className="relative" ref={settingsRef}>
                <button onClick={() => { setIsSettingsOpen(v => !v); setIsDropdownOpen(false); }}
                  className={`p-2 rounded-lg transition-colors ${t.mutedText} hover:text-[#6b1c35] ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                >
                  <Settings size={20} />
                </button>
                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
                    <p className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Apariencia</p>
                    <button onClick={() => setIsDark(false)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold rounded-lg transition-colors ${!isDark ? 'bg-[#f4f1ea] text-[#6b1c35]' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="flex items-center gap-2"><Sun size={14} />Claro Institucional</span>
                      {!isDark && <CheckCircle2 size={13} />}
                    </button>
                    <button onClick={() => setIsDark(true)}
                      className={`w-full flex items-center justify-between px-3 py-2 mt-0.5 text-sm font-bold rounded-lg transition-colors ${isDark ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      <span className="flex items-center gap-2"><Moon size={14} />Oscuro</span>
                      {isDark && <CheckCircle2 size={13} className="text-[#b39656]" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 👤 User Menu */}
              <div className={`relative border-l ${t.headerBorder} pl-4`} ref={userMenuRef}>
                <button onClick={() => { setIsDropdownOpen(v => !v); setIsSettingsOpen(false); }}
                  className="flex items-center gap-2 focus:outline-none group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#f4f1ea] border border-[#b39656] flex items-center justify-center">
                    <UserCircle size={22} className="text-[#6b1c35]" />
                  </div>
                  <span className={`hidden sm:block text-sm font-bold max-w-[120px] truncate ${isDark ? 'text-white' : 'text-slate-700'} group-hover:text-[#6b1c35] transition-colors`}>
                    {userName}
                  </span>
                  <ChevronDown size={14} className={t.mutedText} />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                      <p className={`text-[10px] font-bold mt-0.5 capitalize ${isAdmin ? 'text-[#6b1c35]' : 'text-slate-400'}`}>{userRole}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-[#6b1c35] font-bold hover:bg-[#f4f1ea] flex items-center gap-2 mt-1 transition-colors">
                      <LogOut size={14} />Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ── Dynamic Content ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">

          {/* ══════════════ PIPELINES ══════════════ */}
          {currentView === 'pipelines' && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>Pipelines Operativos</h2>
                  <p className={`${t.mutedText} text-sm mt-1`}>Solo ves tus proyectos personales y los que comparten contigo.</p>
                </div>
                <button onClick={() => setIsProjectModalOpen(true)} disabled={!userEmail}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#6b1c35] hover:bg-[#581c2f] text-white font-bold text-sm rounded-lg shadow-md shadow-[#6b1c35]/20 transition-colors disabled:opacity-40"
                >
                  <Plus size={16} />Nuevo Proyecto
                </button>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-4 flex-1">
                <KanbanColumn status="pendiente"   accent="border-t-slate-400" />
                <KanbanColumn status="en_progreso" accent="border-t-[#b39656]" />
                <KanbanColumn status="completado"  accent="border-t-[#6b1c35]" />
              </div>
            </div>
          )}

          {/* ══════════════ CONTACTOS ══════════════ */}
          {currentView === 'contactos' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>Personal del Ayuntamiento</h2>
                  <p className={`${t.mutedText} text-sm mt-1`}>
                    {isAdmin ? 'Vista de Administrador — control total.' : 'Directorio de personal (solo lectura).'}
                  </p>
                </div>
                {isAdmin && (
                  <button onClick={() => setIsAddContactModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#6b1c35] hover:bg-[#581c2f] text-white font-bold text-sm rounded-lg shadow-md transition-colors"
                  >
                    <UserPlus size={16} />Agregar Persona
                  </button>
                )}
              </div>

              <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm overflow-hidden`}>
                <table className="w-full">
                  <thead>
                    <tr className={`${t.tableTh} border-b ${t.cardBorder}`}>
                      <th className={`px-5 py-3 text-left text-xs font-black uppercase tracking-widest ${t.mutedText}`}>Nombre</th>
                      <th className={`px-5 py-3 text-left text-xs font-black uppercase tracking-widest ${t.mutedText}`}>Correo</th>
                      <th className={`px-5 py-3 text-left text-xs font-black uppercase tracking-widest ${t.mutedText}`}>Rol</th>
                      {isAdmin && <th className={`px-5 py-3 text-right text-xs font-black uppercase tracking-widest ${t.mutedText}`}>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingContacts && (
                      <tr><td colSpan={isAdmin ? 4 : 3} className={`px-5 py-10 text-center text-sm ${t.mutedText}`}><Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#b39656]"/>Buscando contactos...</td></tr>
                    )}
                    {!isLoadingContacts && contacts.map(c => (
                      <tr key={c.id || c.email || Math.random().toString()} className={`${t.tableHover} transition-colors`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#f4f1ea] border border-[#b39656] flex items-center justify-center">
                              <UserCircle size={18} className="text-[#6b1c35]" />
                            </div>
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{c.name ?? '—'}</span>
                          </div>
                        </td>
                        <td className={`px-5 py-3.5 text-sm ${t.mutedText}`}>{c.email ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize border ${
                            c.role === 'administrador' ? 'bg-[#6b1c35]/10 text-[#6b1c35] border-[#6b1c35]/20' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>{c.role || 'empleado'}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => c.id && handleDeleteContact(c.id)}
                              disabled={!c.id}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!isLoadingContacts && contacts.length === 0 && (
                      <tr><td colSpan={isAdmin ? 4 : 3} className={`px-5 py-10 text-center text-sm ${t.mutedText}`}>Sin contactos registrados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════ ACTIVIDADES — CALENDAR ══════════════ */}
          {currentView === 'actividades' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                    className={`p-2 rounded-lg ${t.mutedText} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} hover:text-[#6b1c35] transition-colors`}
                  ><ChevronLeft size={18} /></button>
                  <h2 className={`text-xl font-extrabold capitalize ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>{monthLabel}</h2>
                  <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                    className={`p-2 rounded-lg ${t.mutedText} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} hover:text-[#6b1c35] transition-colors`}
                  ><ChevronRight size={18} /></button>
                </div>
                <button onClick={() => setIsEventModalOpen(true)} disabled={!userEmail}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#6b1c35] hover:bg-[#581c2f] text-white font-bold text-sm rounded-lg shadow-md transition-colors disabled:opacity-40"
                >
                  <Plus size={16} />Agregar Evento
                </button>
              </div>

              <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col`}>
                <div className={`grid grid-cols-7 border-b ${t.cardBorder} ${t.calHdr}`}>
                  {DAYS_OF_WEEK.map(d => (
                    <div key={d} className={`py-2.5 text-center text-[10px] font-black uppercase tracking-widest ${t.mutedText} border-r ${t.cardBorder} last:border-0`}>{d}</div>
                  ))}
                </div>
                <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: 'minmax(90px, 1fr)' }}>
                  {buildCalendar().map((date, i) => {
                    const events  = date ? eventsOnDay(date) : [];
                    const isToday = date?.toDateString() === new Date().toDateString();
                    return (
                      <div key={i} onClick={() => date && handleDayClick(date)}
                        className={`p-2 border-r border-b ${t.cardBorder} ${date ? `${t.calCell} ${t.calHover} cursor-pointer` : t.calOther} transition-colors overflow-hidden group/cell`}
                      >
                        {date && (
                          <>
                            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-[#6b1c35] text-white shadow-sm' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {date.getDate()}
                            </span>
                            <div className="space-y-1">
                              {events.slice(0, 3).map(ev => {
                                const isOwn = ev.creador_email === userEmail;
                                const canShare = isOwn || isAdmin;
                                return (
                                  <div key={ev.id} className={`text-[10px] truncate rounded px-1.5 py-0.5 border font-semibold flex justify-between items-center group/event ${
                                    ev.isExternal 
                                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                      : 'bg-[#6b1c35]/10 text-[#6b1c35] border-[#6b1c35]/15'
                                  }`}>
                                    <span className="truncate">
                                      {new Date(ev.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} {ev.titulo}
                                    </span>
                                    <div className="hidden group-hover/event:flex items-center">
                                      {canShare && !ev.isExternal && (
                                        <button 
                                          onClick={(e) => openShareEventModal(ev, e)}
                                          title="Compartir Evento"
                                          className="ml-1 hover:text-[#581c2f] transition-colors"
                                        >
                                          <Lock size={10} />
                                        </button>
                                      )}
                                      {canShare && !ev.isExternal && (
                                        <button 
                                          onClick={(e) => openDeleteModal(ev.id, 'agenda', ev.titulo, e)}
                                          title="Eliminar Evento"
                                          className="ml-1 text-red-400 hover:text-red-600 transition-colors"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {events.length > 3 && <p className={`text-[10px] font-bold ${t.mutedText} pl-1`}>+{events.length - 3} más</p>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ DASHBOARDS ══════════════ */}
          {currentView === 'dashboards' && (
            <div className="h-full flex flex-col gap-6 max-w-5xl mx-auto w-full">
              {activeProject ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>Dashboard: {activeProject.title}</h2>
                      <p className={`${t.mutedText} text-sm mt-1`}>Rendimiento y Carga de Trabajo</p>
                    </div>
                    <button onClick={() => setCurrentView('pipelines')} className={`p-2 rounded-lg ${t.calHover} ${t.mutedText} transition-colors flex items-center gap-1 font-bold`}><ChevronLeft size={20} /> Volver</button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm p-6`}>
                      <h3 className={`text-sm font-black uppercase tracking-widest text-[#6b1c35] mb-6`}>Historial de Postergaciones</h3>
                      <div className="h-64 w-full">
                        {activeProjectDelays.length === 0 ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <CheckCircle2 size={32} className="mb-2 text-emerald-500" />
                            <p className="text-sm font-medium">No hay postergaciones.</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activeProjectDelays.map((d, i) => ({ name: `Mod #${i+1}`, old: new Date(d.old_date).getTime(), new: new Date(d.new_date).getTime() }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                              <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis domain={['auto', 'auto']} stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                                labelStyle={{ color: '#b39656', fontWeight: 'bold' }}
                                formatter={(val: any) => (val ? new Date(Number(val)).toLocaleDateString() : '')}
                              />
                              <Bar dataKey="old" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Anterior" />
                              <Bar dataKey="new" fill="#6b1c35" radius={[4, 4, 0, 0]} name="Nueva" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                    
                    <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm p-6`}>
                      <h3 className={`text-sm font-black uppercase tracking-widest text-[#6b1c35] mb-6`}>Carga de Trabajo por Usuario</h3>
                      <div className="h-64 w-full">
                        {pipelineTasks.length === 0 ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Users size={32} className="mb-2" />
                            <p className="text-sm font-medium">No hay tareas asignadas.</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={
                              Object.entries(
                                pipelineTasks.reduce((acc, task) => {
                                  const user = task.assignee_email || 'Sin asignar';
                                  acc[user] = (acc[user] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>)
                              ).map(([name, count]) => ({ name: name.split('@')[0], count }))
                            }>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                              <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis allowDecimals={false} stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                                itemStyle={{ color: '#b39656', fontWeight: 'bold' }}
                              />
                              <Bar dataKey="count" fill="#b39656" radius={[4, 4, 0, 0]} name="Tareas" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>Procesador de Minutas con IA</h2>
                      <p className={`${t.mutedText} text-sm mt-1`}>Sube archivos de reuniones para generar síntesis y gráficas automáticas.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm p-6 lg:col-span-1 h-fit`}>
                      <div className="flex items-center gap-2 mb-4">
                        <UploadCloud size={20} className="text-[#b39656]" />
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Subir Archivo</h3>
                      </div>
                      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                        isProcessingAI ? 'border-slate-300 bg-slate-50' : 'border-[#b39656]/30 hover:bg-[#b39656]/5'
                      }`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {isProcessingAI ? (
                            <>
                              <Loader2 size={24} className="text-[#b39656] animate-spin mb-2" />
                              <p className="text-sm font-semibold text-slate-500">Analizando con IA...</p>
                            </>
                          ) : (
                            <>
                              <FileText size={24} className="text-[#b39656] mb-2" />
                              <p className="text-sm font-semibold text-[#6b1c35]">Seleccionar o arrastrar</p>
                              <p className="text-xs text-slate-400 mt-1">.txt, .md, .csv</p>
                            </>
                          )}
                        </div>
                        <input type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleUploadAndProcess} disabled={isProcessingAI} />
                      </label>
                      {aiError && <p className="text-xs text-red-500 mt-3 font-semibold">{aiError}</p>}
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                  {aiData ? (
                    <>
                      <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm p-6`}>
                        <h3 className={`text-sm font-black uppercase tracking-widest text-[#6b1c35] mb-3`}>Síntesis de IA</h3>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{aiData.resumenEjecutivo}</p>
                      </div>

                      <div className={`${t.cardBg} border ${t.cardBorder} rounded-2xl shadow-sm p-6`}>
                        <h3 className={`text-sm font-black uppercase tracking-widest text-[#6b1c35] mb-6`}>Métricas Extraídas</h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={aiData.datosGraficos}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} vertical={false} />
                              <XAxis dataKey="nombre" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '8px' }}
                                itemStyle={{ color: '#b39656', fontWeight: 'bold' }}
                                cursor={{ fill: isDark ? '#334155' : '#f1f5f9' }}
                              />
                              <Bar dataKey="valor" fill="#6b1c35" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={`h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed ${t.cardBorder} rounded-2xl`}>
                      <LayoutDashboard size={40} className="text-slate-300 mb-3" />
                      <p className={`text-sm font-semibold ${t.mutedText}`}>Sube un archivo para visualizar las métricas y la síntesis generada por la IA.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
          {/* ══════════════ PIPELINES ══════════════ */}
          {currentView === 'pipelines' && (
            <div className="h-full flex flex-col w-full max-w-7xl mx-auto">
              {!activeProject ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>Projects</h2>
                      <p className={`${t.mutedText} text-sm mt-1`}>Manage your production pipelines.</p>
                    </div>
                    <button onClick={() => setIsAddProjectModalOpen(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                      <Plus size={16} /> Add Project
                    </button>
                  </div>
                  <div className={`overflow-x-auto ${t.cardBg} rounded-xl border ${t.cardBorder}`}>
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className={`border-b ${t.cardBorder} ${t.tableTh}`}>
                        <tr>
                          <th className="py-3 px-4 font-bold text-slate-500">Title</th>
                          <th className="py-3 px-4 font-bold text-slate-500">Customer</th>
                          <th className="py-3 px-4 font-bold text-slate-500">Status</th>
                          <th className="py-3 px-4 font-bold text-slate-500">Visibility</th>
                          <th className="py-3 px-4 font-bold text-slate-500">Start Date</th>
                          <th className="py-3 px-4 font-bold text-slate-500">End Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {projects.map(proj => (
                          <tr key={proj.id} onClick={() => { setActiveProject(proj); fetchPipelineTasks(proj.id); }} className={`cursor-pointer ${t.tableHover} transition-colors`}>
                            <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200">{proj.title}</td>
                            <td className="py-4 px-4 text-slate-500">{proj.customer}</td>
                            <td className="py-4 px-4"><span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{proj.status}</span></td>
                            <td className="py-4 px-4 text-slate-400"><Globe size={14}/></td>
                            <td className="py-4 px-4 text-slate-500">{proj.start_date ? new Date(proj.start_date).toLocaleDateString() : '-'}</td>
                            <td className="py-4 px-4 text-slate-500">{proj.end_date ? new Date(proj.end_date).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                        {projects.length === 0 && (
                          <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-medium">No hay proyectos. Crea uno nuevo.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <button onClick={() => { setActiveProject(null); setActiveTask(null); }} className={`p-2 rounded-lg ${t.calHover} ${t.mutedText} transition-colors`}><ChevronLeft size={24} /></button>
                      <div>
                        <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{activeProject.title}</h2>
                        <p className={`text-xs font-medium ${t.mutedText}`}>{activeProject.customer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className={`text-xs font-bold ${t.mutedText} uppercase`}>Est. Delivery:</label>
                        <input 
                          type="date"
                          value={activeProject.estimated_delivery ? new Date(activeProject.estimated_delivery).toISOString().split('T')[0] : ''}
                          onChange={(e) => {
                            const newDateStr = e.target.value;
                            if (!newDateStr) return;
                            const newDate = new Date(newDateStr).toISOString();
                            if (activeProject.estimated_delivery !== newDate) {
                              handleUpdateProjectDelivery(activeProject.id, activeProject.estimated_delivery || new Date().toISOString(), newDate);
                            }
                          }}
                          className={`${INPUT} py-1.5 px-3 max-w-[150px]`}
                        />
                      </div>
                      <button onClick={() => setCurrentView('dashboards')} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                        <LayoutDashboard size={16} /> Dashboard
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 h-[calc(100vh-200px)] overflow-x-auto pb-4 items-start">
                    {['Story Board', 'Character Design', 'Final Composition'].map(col => {
                      const colTasks = pipelineTasks.filter(t => t.column_name === col);
                      return (
                        <div key={col} className={`min-w-[320px] max-w-[320px] rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border ${t.cardBorder} flex flex-col max-h-full`}>
                          <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{col} <span className="text-xs text-slate-400 ml-1 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{colTasks.length}</span></h3>
                            <button onClick={() => { setAddTaskColumn(col); setIsAddTaskModalOpen(true); }} className="text-slate-400 hover:text-green-500 transition-colors"><Plus size={18}/></button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {colTasks.map(task => (
                              <div key={task.id} onClick={() => { setActiveTask(task); fetchComments(task.id); }} className={`${t.cardBg} border ${t.cardBorder} p-3.5 rounded-lg shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group`}>
                                <h4 className={`font-semibold text-sm mb-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{task.title}</h4>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                  <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"><CalendarDays size={12}/> {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${task.priority === 'High' ? 'bg-red-100 text-red-600' : task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>{task.priority}</span>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => { setAddTaskColumn(col); setIsAddTaskModalOpen(true); }} className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center gap-1 text-sm font-semibold transition-all">
                              <Plus size={16}/> Add Task
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════ MENSAJES — GMAIL CLIENT ══════════════ */}
          {currentView === 'mensajes' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6 flex justify-between items-end">
                <div>
                  <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>Mensajería Institucional</h2>
                  <p className={`${t.mutedText} text-sm mt-1`}>Envía correos oficiales con documentos adjuntos vía Gmail.</p>
                </div>
                <button 
                  onClick={handleOpenGmail} 
                  className="text-sm font-bold text-[#b39656] hover:text-[#6b1c35] transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                >
                  <Mail size={14} /> Abrir Bandeja de Entrada
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-3.5 bg-[#f9f9f9] border-b border-slate-200 flex items-center gap-2">
                  <Mail size={18} className="text-[#6b1c35]" />
                  <span className="font-extrabold text-slate-700 text-sm">Nuevo Mensaje</span>
                </div>
                
                {emailStatus === 'sending' && uploadProgress > 0 && (
                  <div className="w-full h-1 bg-slate-100">
                    <div 
                      className="h-full bg-[#6b1c35] transition-all duration-200 ease-out" 
                      style={{ width: `${uploadProgress}%` }} 
                    />
                  </div>
                )}

                <form onSubmit={handleSendEmail} className="divide-y divide-slate-100">
                  <div className="flex items-center gap-3 px-6 py-3.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-14">Para</span>
                    <input
                      type="text"
                      value={emailTo}
                      onChange={e => setEmailTo(e.target.value)}
                      placeholder="correo@municipio.gob.mx"
                      className="flex-1 text-sm font-medium text-black placeholder-slate-400 bg-transparent border-none focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3 px-6 py-3.5">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-14">Asunto</span>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Notificación oficial..."
                      className="flex-1 text-sm font-medium text-black placeholder-slate-400 bg-transparent border-none focus:outline-none"
                      required
                    />
                  </div>
                  <div className="px-6 py-4">
                    <textarea
                      value={emailMessage}
                      onChange={e => setEmailMessage(e.target.value)}
                      rows={8}
                      placeholder="Escribe el contenido del mensaje aquí..."
                      className="w-full text-sm font-medium text-black placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-4 resize-none focus:outline-none focus:border-[#581c2f] focus:ring-1 focus:ring-[#581c2f]"
                      required
                    />
                  </div>
                  
                  {emailFiles.length > 0 && (
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                      {emailFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                          {f.type.startsWith('image/') ? <ImageIcon size={14} className="text-[#b39656]" /> : <FileText size={14} className="text-[#6b1c35]" />}
                          <span className="text-xs font-bold text-slate-700 max-w-[150px] truncate">{f.name}</span>
                          <button 
                            type="button" 
                            onClick={() => removeFile(i)}
                            className="ml-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-600 cursor-pointer transition-colors">
                      <Paperclip size={15} className="text-[#b39656]" />
                      Adjuntar Documento
                      <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                    <div className="flex items-center gap-3 ml-auto">
                      {emailStatus === 'error' && (
                        <span className="flex items-center gap-1.5 text-red-500 text-sm font-bold"><X size={14} />{emailError}</span>
                      )}
                      {emailStatus === 'sent' && (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={14} />¡Enviado!
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#6b1c35] hover:bg-[#581c2f] text-white font-bold text-sm rounded-lg shadow-md transition-all disabled:opacity-50"
                      >
                        {emailStatus === 'sending' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        {emailStatus === 'sending' ? 'Procesando...' : 'Enviar Mensaje'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* ══════════════════════════════════════════════════════
              PIPELINES MODALS
          ══════════════════════════════════════════════════════ */}
          {isAddProjectModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className={`${t.cardBg} rounded-xl shadow-2xl border ${t.cardBorder} w-full max-w-lg overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${t.cardBorder} flex justify-between items-center`}>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Add Project</h3>
                  <button onClick={() => setIsAddProjectModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <form onSubmit={handleAddProjectPipeline} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name *</label>
                    <input type="text" value={newProjectData.title} onChange={e => setNewProjectData({...newProjectData, title: e.target.value})} className={INPUT} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer *</label>
                    <input type="text" value={newProjectData.customer} onChange={e => setNewProjectData({...newProjectData, customer: e.target.value})} className={INPUT} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                    <input type="text" value={newProjectData.status} onChange={e => setNewProjectData({...newProjectData, status: e.target.value})} className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Budget Type</label>
                      <input type="text" value={newProjectData.budget_type} onChange={e => setNewProjectData({...newProjectData, budget_type: e.target.value})} className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Billing Method</label>
                      <input type="text" value={newProjectData.billing_method} onChange={e => setNewProjectData({...newProjectData, billing_method: e.target.value})} className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estimated Delivery *</label>
                    <input type="date" value={newProjectData.estimated_delivery} onChange={e => setNewProjectData({...newProjectData, estimated_delivery: e.target.value})} className={INPUT} required />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors">
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isAddTaskModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className={`${t.cardBg} rounded-xl shadow-2xl border ${t.cardBorder} w-full max-w-sm overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${t.cardBorder} flex justify-between items-center`}>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Add Task to {addTaskColumn}</h3>
                  <button onClick={() => setIsAddTaskModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <form onSubmit={handleAddTaskPipeline} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Task Title *</label>
                    <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className={INPUT} required />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button type="submit" className="bg-green-500 hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors">
                      Add Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTask && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className={`${t.cardBg} rounded-xl shadow-2xl border ${t.cardBorder} w-full max-w-5xl h-[80vh] flex overflow-hidden`}>
                {/* Left Panel: Task Details */}
                <div className={`w-3/5 p-8 overflow-y-auto border-r ${t.cardBorder}`}>
                  <div className="flex justify-between items-start mb-6">
                    <h2 className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>{activeTask.title}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign To</label>
                      <select 
                        value={activeTask.assignee_email || ''} 
                        onChange={e => handleUpdateTaskPipeline(activeTask.id, { assignee_email: e.target.value })}
                        className={INPUT}
                      >
                        <option value="">Unassigned</option>
                        {contacts.map(c => <option key={c.email} value={c.email || ''}>{c.name || c.email}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                      <select 
                        value={activeTask.status} 
                        onChange={e => handleUpdateTaskPipeline(activeTask.id, { status: e.target.value })}
                        className={INPUT}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Due Date</label>
                      <input 
                        type="date" 
                        value={activeTask.due_date ? new Date(activeTask.due_date).toISOString().split('T')[0] : ''} 
                        onChange={e => handleUpdateTaskPipeline(activeTask.id, { due_date: new Date(e.target.value).toISOString() })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Priority</label>
                      <select 
                        value={activeTask.priority} 
                        onChange={e => handleUpdateTaskPipeline(activeTask.id, { priority: e.target.value })}
                        className={INPUT}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase">Description</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAIAssistant(activeTask.description || activeTask.title, "Mejorar redacción de la descripción", (res) => handleUpdateTaskPipeline(activeTask.id, { description: res }))}
                          className="text-xs font-bold text-[#b39656] hover:text-[#6b1c35] flex items-center gap-1 bg-[#b39656]/10 px-2 py-1 rounded"
                        >
                          <Sun size={12} /> Mejorar con IA
                        </button>
                      </div>
                    </div>
                    <textarea 
                      value={activeTask.description || ''} 
                      onChange={e => handleUpdateTaskPipeline(activeTask.id, { description: e.target.value })}
                      placeholder="Añade una descripción..."
                      className={`${INPUT} min-h-[150px] resize-y`}
                    />
                  </div>
                </div>
                
                {/* Right Panel: Comments Chat */}
                <div className="w-2/5 flex flex-col bg-slate-50 dark:bg-slate-900/50">
                  <div className={`p-4 border-b ${t.cardBorder} flex justify-between items-center bg-white dark:bg-slate-900`}>
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Comments</h3>
                    <button onClick={() => setActiveTask(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 text-xs">
                          {comment.user_email.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{comment.user_email.split('@')[0]}</span>
                            <span className="text-[10px] text-slate-400">{new Date(comment.creado_en).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">No hay comentarios aún.</p>}
                  </div>
                  <div className={`p-4 bg-white dark:bg-slate-900 border-t ${t.cardBorder}`}>
                    <div className="flex justify-between items-center mb-2">
                      <button 
                        onClick={() => handleAIAssistant(newComment || comments.map(c => c.content).join('\n'), "Sugerir o generar respuesta profesional para los comentarios", (res) => setNewComment(res))}
                        className="text-[10px] font-bold text-[#b39656] hover:text-[#6b1c35] flex items-center gap-1 bg-[#b39656]/10 px-2 py-1 rounded transition-colors"
                      >
                        <Sun size={10} /> Respuesta IA
                      </button>
                    </div>
                    <form onSubmit={handleAddCommentPipeline} className="relative">
                      <input 
                        type="text" 
                        value={newComment} 
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Write a comment..." 
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:border-[#6b1c35]"
                      />
                      <button type="submit" disabled={!newComment.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#6b1c35] disabled:opacity-50">
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL — DELETE CONFIRMATION
      ══════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 mb-1">¿Eliminar elemento?</h3>
              <p className="text-sm text-slate-500 mb-2">Estás a punto de eliminar permanentemente:</p>
              <p className="text-sm font-bold text-slate-800 px-4 py-2 bg-slate-50 rounded-lg inline-block border border-slate-200 truncate max-w-full">
                {itemToDelete.title}
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }}
                className="flex-1 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteItem}
                className="flex-1 py-3.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — NUEVO EVENTO
      ══════════════════════════════════════════════════════ */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-[#581c2f] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-extrabold text-white">Nuevo Evento</h3>
              <button onClick={closeEventModal} className="text-[#dfd3c3] hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Título del Evento</label>
                <input type="text" required value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Ej. Reunión de Gabinete" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Fecha y Hora</label>
                <input type="datetime-local" required value={eventDate} onChange={e => setEventDate(e.target.value)} className={INPUT} style={{ colorScheme: 'light' }} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo de Evento</label>
                <select value={eventType} onChange={e => setEventType(e.target.value)} className={INPUT}>
                  <option>Reunión</option><option>Tarea</option><option>Audiencia</option><option>Comisión</option>
                </select>
              </div>
              
              {/* Visibilidad de Calendario */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Visibilidad Inicial</label>
                <div className="flex gap-2">
                  {([
                    { val: 'personal',   label: 'Personal',   icon: Lock,  desc: 'Solo yo'         },
                    { val: 'compartido', label: 'Compartir',  icon: Users, desc: 'Con alguien'      },
                    { val: 'global',     label: 'Todos',      icon: Globe, desc: 'Todo el equipo'   },
                  ] as const).map(opt => (
                    <button key={opt.val} type="button" onClick={() => setEventVisibility(opt.val)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                        eventVisibility === opt.val
                          ? 'border-[#6b1c35] bg-[#6b1c35]/8 text-[#6b1c35]'
                          : 'border-slate-200 text-slate-500 hover:border-[#b39656]'
                      }`}
                    >
                      <opt.icon size={16} />
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-medium opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {eventVisibility === 'compartido' && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Selecciona a quién invitar
                  </label>
                  <ContactsSelect 
                    value={eventShareEmail} 
                    onChange={setEventShareEmail} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Lista extraída dinámicamente de la base de datos.</p>
                </div>
              )}

              {!showGuests && eventVisibility !== 'compartido' ? (
                <button type="button" onClick={() => setShowGuests(true)} className="flex items-center gap-1.5 text-sm font-bold text-[#b39656] hover:text-[#6b1c35] transition-colors">
                  <Plus size={14} />Agregar descripción de Invitados
                </button>
              ) : (eventVisibility !== 'compartido') && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Nota de Invitados</label>
                  <input type="text" value={eventGuests} onChange={e => setEventGuests(e.target.value)} placeholder="Menciona otros invitados..." className={INPUT} />
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={closeEventModal} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmittingEvent || !userEmail} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#581c2f] hover:bg-[#6b1c35] rounded-lg transition-colors disabled:opacity-50">
                  {isSubmittingEvent ? 'Guardando...' : 'Guardar y Sincronizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — COMPARTIR EVENTO EXISTENTE (AGENDA)
      ══════════════════════════════════════════════════════ */}
      {isShareEventModalOpen && eventToShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-[#6b1c35] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-lg font-extrabold text-white">Privacidad del Evento</h3>
                <p className="text-[10px] text-[#dfd3c3] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[280px]">
                  {eventToShare.titulo}
                </p>
              </div>
              <button onClick={() => setIsShareEventModalOpen(false)} className="text-[#dfd3c3] hover:text-white text-2xl leading-none">×</button>
            </div>
            
            <form onSubmit={handleUpdateEventVisibility} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Visibilidad Actual</label>
                <div className="flex gap-2">
                  {([
                    { val: 'personal',   label: 'Personal',   icon: Lock,  desc: 'Solo yo'         },
                    { val: 'compartido', label: 'Compartir',  icon: Users, desc: 'Con alguien'      },
                    { val: 'global',     label: 'Todos',      icon: Globe, desc: 'Todo el equipo'   },
                  ] as const).map(opt => (
                    <button key={opt.val} type="button" onClick={() => setEventVisibility(opt.val)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                        eventVisibility === opt.val
                          ? 'border-[#6b1c35] bg-[#6b1c35]/8 text-[#6b1c35]'
                          : 'border-slate-200 text-slate-500 hover:border-[#b39656]'
                      }`}
                    >
                      <opt.icon size={16} />
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-medium opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {eventVisibility === 'compartido' && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Miembro Autorizado
                  </label>
                  <ContactsSelect 
                    value={eventShareEmail} 
                    onChange={setEventShareEmail} 
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsShareEventModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmittingEvent} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#581c2f] hover:bg-[#6b1c35] rounded-lg transition-colors disabled:opacity-50">
                  {isSubmittingEvent ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — NUEVO PROYECTO
      ══════════════════════════════════════════════════════ */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-[#581c2f] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-extrabold text-white">Nuevo Proyecto</h3>
              <button onClick={() => { setIsProjectModalOpen(false); resetProjectForm(); }} className="text-[#dfd3c3] hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Nombre del Proyecto</label>
                <input type="text" required value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Ej. Auditoría Q2" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Descripción (Opcional)</label>
                <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows={2} placeholder="Detalles del proyecto..." className={`${INPUT} resize-none`} />
              </div>

              {/* ── Visibility Control ─────────────────── */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Visibilidad Inicial</label>
                <div className="flex gap-2">
                  {([
                    { val: 'personal',   label: 'Personal',   icon: Lock,  desc: 'Solo yo'         },
                    { val: 'compartido', label: 'Compartir',  icon: Users, desc: 'Con alguien'      },
                    { val: 'global',     label: 'Todos',      icon: Globe, desc: 'Todo el equipo'   },
                  ] as const).map(opt => (
                    <button key={opt.val} type="button" onClick={() => setProjectVisibility(opt.val)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                        projectVisibility === opt.val
                          ? 'border-[#6b1c35] bg-[#6b1c35]/8 text-[#6b1c35]'
                          : 'border-slate-200 text-slate-500 hover:border-[#b39656]'
                      }`}
                    >
                      <opt.icon size={16} />
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-medium opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {projectVisibility === 'compartido' && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Compartir con
                  </label>
                  <ContactsSelect 
                    value={shareWithEmail} 
                    onChange={setShareWithEmail} 
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setIsProjectModalOpen(false); resetProjectForm(); }} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmittingProject || !userEmail} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#581c2f] hover:bg-[#6b1c35] rounded-lg transition-colors disabled:opacity-50">
                  {isSubmittingProject ? 'Guardando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — COMPARTIR PROYECTO EXISTENTE
      ══════════════════════════════════════════════════════ */}
      {isShareModalOpen && projectToShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-[#6b1c35] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-lg font-extrabold text-white">Privacidad del Proyecto</h3>
                <p className="text-[10px] text-[#dfd3c3] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[280px]">
                  {projectToShare.titulo}
                </p>
              </div>
              <button onClick={() => setIsShareModalOpen(false)} className="text-[#dfd3c3] hover:text-white text-2xl leading-none">×</button>
            </div>
            
            <form onSubmit={handleUpdateProjectVisibility} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Visibilidad Actual</label>
                <div className="flex gap-2">
                  {([
                    { val: 'personal',   label: 'Personal',   icon: Lock,  desc: 'Solo yo'         },
                    { val: 'compartido', label: 'Compartir',  icon: Users, desc: 'Con alguien'      },
                    { val: 'global',     label: 'Todos',      icon: Globe, desc: 'Todo el equipo'   },
                  ] as const).map(opt => (
                    <button key={opt.val} type="button" onClick={() => setProjectVisibility(opt.val)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                        projectVisibility === opt.val
                          ? 'border-[#6b1c35] bg-[#6b1c35]/8 text-[#6b1c35]'
                          : 'border-slate-200 text-slate-500 hover:border-[#b39656]'
                      }`}
                    >
                      <opt.icon size={16} />
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-medium opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {projectVisibility === 'compartido' && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                    Miembro Autorizado
                  </label>
                  <ContactsSelect 
                    value={shareWithEmail} 
                    onChange={setShareWithEmail} 
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsShareModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmittingProject} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#581c2f] hover:bg-[#6b1c35] rounded-lg transition-colors disabled:opacity-50">
                  {isSubmittingProject ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — AGREGAR CONTACTO (ADMIN ONLY)
      ══════════════════════════════════════════════════════ */}
      {isAddContactModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="bg-[#581c2f] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-extrabold text-white">Agregar Persona</h3>
              <button onClick={() => setIsAddContactModalOpen(false)} className="text-[#dfd3c3] hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ej. María López Sánchez" className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Correo Gmail</label>
                <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="empleado@municipio.gob.mx" className={INPUT} />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddContactModalOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmittingContact} className="flex-1 py-2.5 text-sm font-bold text-white bg-[#581c2f] hover:bg-[#6b1c35] rounded-lg transition-colors disabled:opacity-50">
                  {isSubmittingContact ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════
          NOTEBOOK / AGENDA SLIDE-OVER
      ══════════════════════════════════════════════════════ */}
      {isNotebookOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsNotebookOpen(false)}>
          <div className={`w-full max-w-md h-full shadow-2xl border-l flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
            <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <Book size={20} className="text-[#b39656]" />
                <h3 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Libreta Rápida</h3>
              </div>
              <button onClick={() => setIsNotebookOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {checklists.map(item => (
                <div key={item.id} className={`flex items-start gap-3 p-4 rounded-xl border shadow-sm transition-all group ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} ${item.estatus === 'completado' ? 'opacity-60' : ''}`}>
                  <button onClick={() => handleUpdateStatus(item.id, item.estatus === 'completado' ? 'pendiente' : 'completado')} className={`mt-0.5 flex-shrink-0 ${item.estatus === 'completado' ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}>
                    <CheckCircle2 size={18} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold break-words ${isDark ? 'text-slate-200' : 'text-slate-700'} ${item.estatus === 'completado' ? 'line-through text-slate-400' : ''}`}>
                      {item.titulo}
                    </p>
                  </div>
                  <button onClick={(e) => openDeleteModal(item.id, 'checklist', item.titulo, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {checklists.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                  <Book size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="font-semibold text-sm">Tu libreta está vacía.</p>
                  <p className="text-xs mt-1">Añade recordatorios rápidos abajo.</p>
                </div>
              )}
            </div>
            <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <form onSubmit={handleAddProject} className="flex gap-2">
                <input 
                  type="text" 
                  value={projectTitle} 
                  onChange={e => setProjectTitle(e.target.value)}
                  placeholder="Escribe un recordatorio..." 
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#b39656] ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-black placeholder-slate-400 border'}`}
                  disabled={isSubmittingProject}
                />
                <button type="submit" disabled={!projectTitle.trim() || isSubmittingProject} className="bg-[#b39656] hover:bg-[#8f7743] text-white px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                  <Plus size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
