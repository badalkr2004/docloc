import { NextResponse } from 'next/server';
import { shareService } from '@/lib/services/share.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const docs = await shareService.getDocumentsForGrant(id);
  return NextResponse.json(docs);
}
