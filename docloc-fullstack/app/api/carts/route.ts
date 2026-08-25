export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { cartService } from '@/lib/services/cart.service';
import { createCartSchema } from '@/lib/schemas/cart.schema';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const carts = await cartService.list(session.user.id);
  return NextResponse.json(carts);
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const cart = await cartService.create(session.user.id, parsed.data.label);
  return NextResponse.json(cart, { status: 201 });
}

