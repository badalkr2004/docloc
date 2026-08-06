import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { bucketService } from '@/lib/services/bucket.service';
import { updateBucketSchema } from '@/lib/schemas/bucket.schema';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const bucket = await bucketService.getById(id, session.user.id);
    return NextResponse.json(bucket);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateBucketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const bucket = await bucketService.update(id, session.user.id, parsed.data);
  return NextResponse.json(bucket);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  await bucketService.deleteBucket(id, session.user.id);
  return NextResponse.json({ success: true });
}
