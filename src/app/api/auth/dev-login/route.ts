import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const admin = createSupabaseAdminClient();
    const serverSupabase = await createSupabaseServerClient();

    const targetEmail = 'ucarmonagonzalez@gmail.com';

    // Generar enlace/OTP mediante la clave service role
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail
    });

    if (linkError || !link?.properties?.email_otp) {
      console.error('Error generando OTP de desarrollo:', linkError);
      return NextResponse.json({ error: linkError?.message || 'Error al generar acceso directo' }, { status: 500 });
    }

    // Verificar el OTP con el cliente del servidor para establecer las cookies de sesión
    const { data: sessionData, error: verifyError } = await serverSupabase.auth.verifyOtp({
      email: targetEmail,
      token: link.properties.email_otp,
      type: 'magiclink'
    });

    if (verifyError || !sessionData?.session) {
      console.error('Error verificando OTP de desarrollo:', verifyError);
      return NextResponse.json({ error: verifyError?.message || 'Error estableciendo sesión' }, { status: 500 });
    }

    return NextResponse.json({ success: true, redirect: '/overview' });
  } catch (err: any) {
    console.error('Excepción en dev-login:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const admin = createSupabaseAdminClient();
    const serverSupabase = await createSupabaseServerClient();
    const targetEmail = 'ucarmonagonzalez@gmail.com';

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail
    });

    if (!linkError && link?.properties?.email_otp) {
      await serverSupabase.auth.verifyOtp({
        email: targetEmail,
        token: link.properties.email_otp,
        type: 'magiclink'
      });
      return NextResponse.redirect(new URL('/overview', request.url));
    }
  } catch (e) {
    console.error(e);
  }
  return NextResponse.redirect(new URL('/login?error=Error_acceso_directo', request.url));
}
