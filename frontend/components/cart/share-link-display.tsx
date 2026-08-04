'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RiFileCopyLine, RiCheckLine, RiAlertFill } from '@remixicon/react';
import { toast } from 'sonner';

export function ShareLinkDisplay({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Share link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
        <RiAlertFill className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Important:</strong> This link contains the decryption key. Share it securely via a private message. Anyone with this link can access the shared documents.
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input 
          value={shareUrl} 
          readOnly 
          className="font-mono text-xs bg-muted"
        />
        <Button onClick={copyToClipboard} variant="secondary" className="shrink-0 gap-2">
          {copied ? <RiCheckLine className="w-4 h-4" /> : <RiFileCopyLine className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
