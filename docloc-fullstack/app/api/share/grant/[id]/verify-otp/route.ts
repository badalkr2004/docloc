import { NextResponse } from 'next/server';
import { shareService } from '@/lib/services/share.service';
import { verifyShareOtpSchema } from '@/lib/schemas/share.schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = verifyShareOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const result = await shareService.verifyRecipientOtp(id, parsed.data.code);
  if (!result.verified) {
    return NextResponse.json({ error: 'Invalid or expired access code' }, { status: 400 });
  }
  return NextResponse.json(result);
}
