'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RiLockLine, RiLoader4Line } from '@remixicon/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCryptoStore } from '@/stores/crypto-store';

export interface PassphraseModalProps {
  isOpen: boolean;
  onUnlocked: () => void;
  encryptedPrivateKey: string;
  keyDerivationSalt: string;
}

export function PassphraseModal({
  isOpen,
  onUnlocked,
  encryptedPrivateKey,
  keyDerivationSalt,
}: PassphraseModalProps) {
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const unlock = useCryptoStore((state) => state.unlock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setError('Please enter your passphrase');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await unlock(encryptedPrivateKey, keyDerivationSalt, passphrase);
      setPassphrase('');
      onUnlocked();
    } catch (err: any) {
      console.error('Failed to unlock:', err);
      setError('Incorrect passphrase');
      toast.error('Incorrect passphrase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Prevent closing the dialog
        if (!open) return;
      }}
    >
      <DialogContent 
        className="[&>button]:hidden sm:max-w-md"
      >
        <DialogHeader className="text-center sm:text-center space-y-3 pt-4">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center">
            <RiLockLine className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-heading">Unlock your Vault</DialogTitle>
          <DialogDescription className="text-base">
            Enter your encryption passphrase to unlock your documents. This is required to decrypt your private key.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase-unlock" className="sr-only">Passphrase</Label>
            <Input
              id="passphrase-unlock"
              type="password"
              placeholder="Enter your passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={isLoading}
              className={error ? "border-destructive" : ""}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              'Unlock Vault'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
