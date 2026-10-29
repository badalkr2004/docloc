'use client';

import { useState } from 'react';
import { useSession, useSignOut, useKeys, useStoreKeys } from '@/lib/api/hooks/use-auth';
import { useTheme } from '@/components/providers/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  RiMoonLine,
  RiSunLine,
  RiComputerLine,
  RiLogoutBoxRLine,
  RiShieldKeyholeLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import {
  decryptPrivateKeyWithPassphrase,
  encryptPrivateKeyWithPassphrase,
} from '@/lib/crypto';
import { useCryptoStore } from '@/stores/crypto-store';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { data: keys } = useKeys();
  const storeKeys = useStoreKeys();
  const signOut = useSignOut();
  const { theme, setTheme } = useTheme();
  const unlock = useCryptoStore((s) => s.unlock);

  const [oldPassphrase, setOldPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isChangingKey, setIsChangingKey] = useState(false);

  const handlePassphraseChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keys?.encryptedPrivateKey || !keys?.keyDerivationSalt || !keys?.publicKey) {
      toast.error('Encryption keys are not available. Unlock your vault first.');
      return;
    }
    if (newPassphrase.length < 8) {
      toast.error('New passphrase must be at least 8 characters');
      return;
    }
    if (newPassphrase !== confirmPassphrase) {
      toast.error('New passphrases do not match');
      return;
    }

    try {
      setIsChangingKey(true);
      const privateKey = decryptPrivateKeyWithPassphrase(
        keys.encryptedPrivateKey,
        keys.keyDerivationSalt,
        oldPassphrase
      );
      const rewrapped = encryptPrivateKeyWithPassphrase(privateKey, newPassphrase);
      await storeKeys.mutateAsync({
        publicKey: keys.publicKey,
        encryptedPrivateKey: rewrapped.encryptedBlob,
        keyDerivationSalt: rewrapped.saltBase64,
      });
      unlock(rewrapped.encryptedBlob, rewrapped.saltBase64, newPassphrase);
      setOldPassphrase('');
      setNewPassphrase('');
      setConfirmPassphrase('');
      toast.success('Passphrase updated. Remember the new one — it cannot be recovered.');
    } catch {
      toast.error('Could not update passphrase. Check your current passphrase and try again.');
    } finally {
      setIsChangingKey(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your account preferences and security.
        </p>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Your personal account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={session?.user?.name || ''} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={session?.user?.email || ''} readOnly className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Docloc looks on your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTheme('light')}
              >
                <RiSunLine className="w-4 h-4" /> Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTheme('dark')}
              >
                <RiMoonLine className="w-4 h-4" /> Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex-1 gap-2"
                onClick={() => setTheme('system')}
              >
                <RiComputerLine className="w-4 h-4" /> System
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiShieldKeyholeLine className="w-5 h-5" />
              Encryption Passphrase
            </CardTitle>
            <CardDescription>
              Updates the passphrase that wraps your private key. If you forget it, you permanently
              lose access to encrypted documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePassphraseChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current Passphrase</Label>
                <Input
                  type="password"
                  value={oldPassphrase}
                  onChange={(e) => setOldPassphrase(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label>New Passphrase</Label>
                <Input
                  type="password"
                  value={newPassphrase}
                  onChange={(e) => setNewPassphrase(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Passphrase</Label>
                <Input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={isChangingKey || storeKeys.isPending}>
                {isChangingKey ? 'Updating…' : 'Update Passphrase'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-dashed opacity-75">
          <CardHeader>
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            <CardDescription>Add an extra layer of security to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => {
              useCryptoStore.getState().lock();
              signOut.mutate();
            }}
            disabled={signOut.isPending}
          >
            <RiLogoutBoxRLine className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
