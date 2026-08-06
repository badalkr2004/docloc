import { NextRequest, NextResponse } from 'next/server';
import { shareService } from '@/lib/services/share.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

  try {
    await shareService.resendOtp(token, ipAddress);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message.includes('Too many') ? 429 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}
