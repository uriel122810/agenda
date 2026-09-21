import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import OverviewClient from './OverviewClient';

export default async function PazSumaOverviewPage() {
  const supabase = await createSupabaseServerClient();

  // 1. Verify session with Supabase
  const { data: { session }, error } = await supabase.auth.getSession();

  // Si hay sesión de Supabase, usarla
  if (session?.user) {
    const { user } = session;
    const { data: profile } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', user.id)
      .single();

    return (
      <OverviewClient
        user={user}
        userRole={(profile?.role as 'administrador' | 'empleado') ?? 'administrador'}
        userName={profile?.name ?? user.email ?? 'Espacio Contador'}
      />
    );
  }

  // Si no hay sesión de Supabase pero estamos en desarrollo o hay cookie dev_auth_session
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const devAuth = cookieStore.get('dev_auth_session');

  if (devAuth?.value === 'true' || process.env.NODE_ENV === 'development') {
    return (
      <OverviewClient
        user={{ id: 'dev-user-001', email: 'ucarmonagonzalez@gmail.com' }}
        userRole="administrador"
        userName="Uriel Gómez"
      />
    );
  }

  // De lo contrario, redirigir al login
  redirect('/login');
}
