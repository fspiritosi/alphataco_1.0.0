import { LoginForm } from '@/features/OperatorPanel/components/LoginForm';
import { supabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Iniciar Sesion - Panel de Operario',
};

export default async function OperatorLoginPage() {
  // If already authenticated with valid operator context, redirect
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if this user has the operator context
    const { data: profile } = await supabase.from('profile').select('employee_id').eq('id', user.id).single();

    if (profile?.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('workshop_sector_id')
        .eq('id', profile.employee_id)
        .single();

      if (employee?.workshop_sector_id) {
        redirect('/operator/dashboard');
      }
    }
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
