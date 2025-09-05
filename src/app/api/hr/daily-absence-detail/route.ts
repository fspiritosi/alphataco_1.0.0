import { getDailyAbsenceDetail } from '@/features/Dashboard/Estadisticas/RecursosHumanos/actions/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;

    const data = await getDailyAbsenceDetail({ date });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    console.error('GET /api/hr/daily-absence-detail error:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
