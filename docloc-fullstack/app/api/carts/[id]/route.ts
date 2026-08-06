import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { cartService } from '@/lib/services/cart.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const result = await cartService.getById(id, session.user.id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  }
}
