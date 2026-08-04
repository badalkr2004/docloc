'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Document } from '@/lib/api/schemas';
import { useSession } from '@/lib/api/hooks/use-auth';
import { useCryptoStore } from '@/stores/crypto-store';
import { useCreateShareGrant } from '@/lib/api/hooks/use-share';
import { unwrapDek, bytesToBase64, bytesToBase64Url } from '@/lib/crypto';
import { randomBytes } from '@noble/hashes/utils.js';
import { gcm } from '@noble/ciphers/aes.js';
import { toast } from 'sonner';
import { ReauthModal } from './reauth-modal';
import { ShareLinkDisplay } from './share-link-display';
import { RiCheckLine, RiLoader4Line } from '@remixicon/react';

interface ShareWizardProps {
  cartId: string;
  documents: Document[];
}

export function ShareWizard({ cartId, documents }: ShareWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const { data: session } = useSession();
  const { secretKey } = useCryptoStore();
  const createShare = useCreateShareGrant();

  // Share Config
  const [recipientEmail, setRecipientEmail] = useState('');
  const [accessType, setAccessType] = useState<'view' | 'download'>('view');
  const [expiresHours, setExpiresHours] = useState('24');
  const [requireOtp, setRequireOtp] = useState(true);

  // State
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const executeShare = async () => {
    if (!secretKey) {
      toast.error('Encryption key not found. Please log in again.');
      return;
    }

    try {
      setStep(3);

      // Generate ONE share key for all documents in this grant
      const shareKey = randomBytes(32);
      
      const wrappedDeks = documents.map(doc => {
        // 1. Unwrap DEK with user's secret key
        const dek = unwrapDek(doc.wrappedDek, secretKey);
        
        // 2. Re-wrap with the new share key
        const nonce = randomBytes(12);
        const cipher = gcm(shareKey, nonce);
        const wrapped = cipher.encrypt(dek);
        
        // Combine nonce + wrapped
        const combined = new Uint8Array(nonce.length + wrapped.length);
        combined.set(nonce, 0);
        combined.set(wrapped, nonce.length);
        
        return {
          documentId: doc.id,
          wrappedDekForGrant: bytesToBase64(combined),
        };
      });

      const response = await createShare.mutateAsync({
        cartId,
        recipientEmail: recipientEmail || undefined,
        accessType,
        expiresInHours: parseInt(expiresHours, 10),
        requireOtp,
        wrappedDeks,
      });

      const shareKeyUrlSafe = bytesToBase64Url(shareKey);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const finalUrl = `${origin}/share/${response.shareToken}#key=${shareKeyUrlSafe}`;
      
      setShareUrl(finalUrl);
      setStep(4);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setIsReauthOpen(true);
        setStep(2); // Go back to config
      } else {
        toast.error('Failed to create share link.');
        setStep(2); // Go back on error
      }
    }
  };

  const handleReauthSuccess = () => {
    setIsReauthOpen(false);
    executeShare();
  };

  return (
    <div className="relative border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm">
      <div className="flex border-b bg-muted/50 p-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex-1 flex items-center justify-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step > s ? <RiCheckLine className="w-4 h-4" /> : s}
            </div>
            <span className={`text-sm ${step >= s ? 'font-medium' : 'text-muted-foreground'} hidden sm:block`}>
              {s === 1 ? 'Review' : s === 2 ? 'Configure' : s === 3 ? 'Encrypting' : 'Done'}
            </span>
          </div>
        ))}
      </div>

      <div className="p-6 relative min-h-[300px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-xl font-semibold">Ready to share?</h3>
                <p className="text-muted-foreground">You are about to share {documents.length} document{documents.length !== 1 && 's'}.</p>
              </div>
              <Button className="w-full" size="lg" onClick={() => setStep(2)}>
                Configure Share Settings
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipient Email (Optional)</label>
                  <Input 
                    type="email" 
                    placeholder="recipient@example.com" 
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">If provided, they will receive the OTP here.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Type</label>
                  <Select value={accessType} onValueChange={(val) => val && setAccessType(val as 'view' | 'download')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only (Secure Preview)</SelectItem>
                      <SelectItem value="download">Allow Download</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Link Expiry</label>
                  <Select value={expiresHours} onValueChange={(val) => val && setExpiresHours(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Hour</SelectItem>
                      <SelectItem value="24">24 Hours</SelectItem>
                      <SelectItem value="168">7 Days</SelectItem>
                      <SelectItem value="720">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Require OTP</label>
                    <p className="text-xs text-muted-foreground">Require recipient to enter a one-time password.</p>
                  </div>
                  <Switch checked={requireOtp} onCheckedChange={setRequireOtp} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={executeShare}>Generate Share Link</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <RiLoader4Line className="w-12 h-12 text-primary animate-spin" />
              <h3 className="text-lg font-medium">Encrypting Documents</h3>
              <p className="text-sm text-muted-foreground text-center">
                Generating secure share key and re-wrapping document keys...
              </p>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RiCheckLine className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold">Share Link Ready</h3>
                <p className="text-sm text-muted-foreground">
                  Your documents have been securely encrypted for sharing.
                </p>
              </div>

              <ShareLinkDisplay shareUrl={shareUrl} />

              <div className="pt-4 border-t flex justify-center">
                <Button variant="outline" onClick={() => {
                  setStep(1);
                  setShareUrl('');
                  setRecipientEmail('');
                }}>
                  Create Another Share
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ReauthModal
        isOpen={isReauthOpen}
        onClose={() => setIsReauthOpen(false)}
        onReauthenticated={handleReauthSuccess}
        email={session?.user?.email || ''}
      />
    </div>
  );
}
