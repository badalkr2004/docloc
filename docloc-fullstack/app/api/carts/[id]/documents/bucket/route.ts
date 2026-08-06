import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { cartService } from '@/lib/services/cart.service';
import { addBucketToCartSchema } from '@/lib/schemas/cart.schema';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = addBucketToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  await cartService.addBucket(id, parsed.data.bucketId, session.user.id);
  return NextResponse.json({ success: true });
}
