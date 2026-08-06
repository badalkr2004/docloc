'use client';

import { useState, useEffect } from 'react';
import { useShareInfo, useVerifyShareOtp, useResendShareOtp } from '@/lib/api/hooks/use-share';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { SharedDocList } from '@/components/share/shared-doc-list';
import { RiShieldKeyholeLine, RiLockPasswordLine, RiErrorWarningLine } from '@remixicon/react';
import { toast } from 'sonner';

export function RecipientView({ token }: { token: string }) {
  const { data: shareInfo, isLoading, error } = useShareInfo(token);
  const verifyOtp = useVerifyShareOtp(token);
  const resendOtp = useResendShareOtp(token);
  
  const [shareKey, setShareKey] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [verifiedDocs, setVerifiedDocs] = useState<any[] | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#key=')) {
      setShareKey(hash.substring(5));
    }
  }, []);

  useEffect(() => {
    if (shareInfo && !shareInfo.grant.requireOtp && !verifiedDocs && !verifyOtp.isPending) {
      verifyOtp.mutateAsync({ token, otp: '' }).then((result) => {
        setVerifiedDocs(result.documents);
      }).catch(() => {});
    }
  }, [shareInfo, verifiedDocs]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    try {
      const result = await verifyOtp.mutateAsync({ token, otp });
      setVerifiedDocs(result.documents);
      toast.success('Access verified');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid or expired OTP');
      setOtp('');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp.mutateAsync({});
      toast.success('A new code has been sent to your email.');
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend code');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-muted rounded-full"></div>
          <div className="h-6 w-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !shareInfo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-card border rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <RiErrorWarningLine className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Link Unavailable</h2>
          <p className="text-muted-foreground text-sm">
            This share link does not exist or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (shareInfo.isExpired || shareInfo.isRevoked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-card border rounded-2xl p-8 shadow-sm">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto">
            <RiErrorWarningLine className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">
            {shareInfo.isRevoked ? 'Share Revoked' : 'Link Expired'}
          </h2>
          <p className="text-muted-foreground text-sm">
            {shareInfo.isRevoked
              ? 'The owner has revoked access to this document package.'
              : 'This share link has expired and is no longer accessible.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <RiShieldKeyholeLine className="w-5 h-5" />
          </div>
          Docloc
        </div>
        <div className="text-sm font-medium px-3 py-1 bg-muted rounded-full">
          Secure Share
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-8 space-y-8 flex-1">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-3xl font-bold tracking-tight">
            {shareInfo.cart.label || 'Shared Document Package'}
          </h1>
          <p className="text-muted-foreground">
            {shareInfo.grant.recipientEmail
              ? `Shared securely with ${shareInfo.grant.recipientEmail}`
              : 'End-to-end encrypted document access'}
          </p>
        </div>

        {shareInfo.grant.requireOtp && !verifiedDocs ? (
          <div className="max-w-md mx-auto bg-card border rounded-2xl p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <RiLockPasswordLine className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">Verification Required</h2>
              <p className="text-sm text-muted-foreground">
                Please enter the 6-digit one-time password sent to you.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6 flex flex-col items-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={verifyOtp.isPending}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <div className="w-full space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={otp.length !== 6 || verifyOtp.isPending}
                >
                  {verifyOtp.isPending ? 'Verifying...' : 'Access Documents'}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={cooldown > 0 || resendOtp.isPending}
                  onClick={handleResend}
                >
                  {resendOtp.isPending 
                    ? 'Sending...' 
                    : cooldown > 0 
                      ? `Resend Code in ${cooldown}s` 
                      : 'Resend Code'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4 pb-4 border-b">
                Available Documents
              </h3>
              <SharedDocList 
                documents={verifiedDocs || []} 
                shareKey={shareKey || ''} 
                accessType={shareInfo.grant.accessType} 
              />
            </div>
            
            <p className="text-center text-xs text-muted-foreground mt-8">
              All documents are end-to-end encrypted. Docloc cannot read the contents of these files.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
