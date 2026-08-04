'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

interface ReauthModalProps {
  isOpen: boolean;
  onReauthenticated: () => void;
  onClose: () => void;
  email: string;
}

export function ReauthModal({ isOpen, onReauthenticated, onClose, email }: ReauthModalProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    try {
      setIsLoading(true);
      await apiClient.post('/api/auth/sign-in/email', {
        email,
        password,
      });
      toast.success('Authentication refreshed successfully');
      setPassword('');
      onReauthenticated();
    } catch (error) {
      toast.error('Authentication failed. Please check your password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Re-authentication Required</DialogTitle>
          <DialogDescription>
            For security, please re-enter your password to share these documents. Your previous session has timed out for sensitive actions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{email}</p>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !password}>
              {isLoading ? 'Verifying...' : 'Verify Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
