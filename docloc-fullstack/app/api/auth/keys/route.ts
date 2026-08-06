import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [foundUser] = await db.select({
      publicKey: userTable.publicKey,
      encryptedPrivateKey: userTable.encryptedPrivateKey,
      keyDerivationSalt: userTable.keyDerivationSalt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      publicKey: foundUser.publicKey,
      encryptedPrivateKey: foundUser.encryptedPrivateKey,
      keyDerivationSalt: foundUser.keyDerivationSalt,
    });
  } catch (error) {
    console.error('Error fetching keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { publicKey, encryptedPrivateKey, keyDerivationSalt } = body;

    if (!publicKey || !encryptedPrivateKey || !keyDerivationSalt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await db.update(userTable)
      .set({
        publicKey,
        encryptedPrivateKey,
        keyDerivationSalt,
      })
      .where(eq(userTable.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
