import { NextResponse } from 'next/server';
import { shareService } from '@/lib/services/share.service';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await shareService.getGrantByToken(token);
  if (!result) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
  return NextResponse.json(result);
}
