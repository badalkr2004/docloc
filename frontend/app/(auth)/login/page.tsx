'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import { RiMailLine, RiLockPasswordLine, RiLoader4Line } from '@remixicon/react';

import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PassphraseModal } from '@/components/auth/passphrase-modal';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    encryptedPrivateKey: string;
    keyDerivationSalt: string;
  }>({
    isOpen: false,
    encryptedPrivateKey: '',
    keyDerivationSalt: '',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setIsLoading(true);
      // Login
      await apiClient.post('/api/auth/sign-in/email', data);
      
      // Fetch keys
      const keysResponse = await apiClient.get('/api/auth/keys');
      const keysData = keysResponse.data;

      if (keysData && keysData.publicKey && keysData.encryptedPrivateKey && keysData.keyDerivationSalt) {
        setModalState({
          isOpen: true,
          encryptedPrivateKey: keysData.encryptedPrivateKey,
          keyDerivationSalt: keysData.keyDerivationSalt,
        });
      } else {
        // No keys set up yet, redirect to vault anyway
        router.push('/vault');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlocked = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    toast.success('Decryption keys loaded successfully');
    router.push('/vault');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-heading font-semibold">Welcome Back</CardTitle>
          <CardDescription>
            Log in to access your secure document locker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <RiMailLine className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...register('email')}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  {...register('password')}
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-6" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log in'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>

      <PassphraseModal
        isOpen={modalState.isOpen}
        onUnlocked={handleUnlocked}
        encryptedPrivateKey={modalState.encryptedPrivateKey}
        keyDerivationSalt={modalState.keyDerivationSalt}
      />
    </div>
  );
}
