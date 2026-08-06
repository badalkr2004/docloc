import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/server/get-auth';
import { bucketService } from '@/lib/services/bucket.service';
import { createBucketSchema } from '@/lib/schemas/bucket.schema';

export async function GET(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const buckets = await bucketService.list(session.user.id);
  return NextResponse.json(buckets);
}

export async function POST(req: Request) {
  const session = await getAuthSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createBucketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation Error', details: parsed.error.flatten() }, { status: 400 });
  }

  const bucket = await bucketService.create(session.user.id, parsed.data);
  return NextResponse.json(bucket, { status: 201 });
}
