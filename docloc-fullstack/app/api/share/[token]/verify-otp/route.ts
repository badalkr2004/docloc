import { NextRequest, NextResponse } from 'next/server';
import { shareService } from '@/lib/services/share.service';
import { auditService } from '@/lib/services/audit.service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { code } = body;
  
  const grantResult = await shareService.getGrantByToken(token);
  if (!grantResult || grantResult.isExpired || grantResult.isRevoked) {
    return NextResponse.json({ error: 'Invalid or expired share token' }, { status: 400 });
  }

  let isVerified = false;
  if (!grantResult.grant.requireOtp) {
    isVerified = true;
  } else {
    try {
      const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
      const result = await shareService.verifyRecipientOtp(grantResult.grant.id, code, ipAddress);
      isVerified = result.verified;
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
  }
  
  if (isVerified) {
    const sharedDocs = await shareService.getDocumentsForGrant(grantResult.grant.id);
    
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    
    await auditService.log({
      action: 'view',
      actorLabel: grantResult.grant.recipientEmail || 'anonymous',
      shareGrantId: grantResult.grant.id,
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({ verified: true, documents: sharedDocs });
  }
  
  return NextResponse.json({ verified: false }, { status: 403 });
}
