'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import { RiMailLine, RiLockPasswordLine, RiLoader4Line, RiShieldKeyholeLine } from '@remixicon/react';

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
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Left Panel - Hidden on small screens */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-950 items-center justify-center overflow-hidden">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-emerald-600 blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-[50%] h-[50%] rounded-full bg-sky-600 blur-[100px]" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative z-10 p-8 xl:p-12 text-white max-w-lg xl:max-w-xl">
          <div className="flex items-center gap-3 mb-8 xl:mb-12">
            <div className="bg-primary/90 p-2 xl:p-2.5 rounded-xl shadow-lg shadow-primary/20 backdrop-blur-md">
               <RiShieldKeyholeLine className="w-6 h-6 xl:w-8 xl:h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl xl:text-3xl font-heading font-bold tracking-tight">DocLocker</span>
          </div>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight mb-4 xl:mb-6">
            Absolute privacy for your sensitive documents.
          </h1>
          <p className="text-base xl:text-lg text-zinc-400 mb-8 xl:mb-12 font-medium">
            End-to-end encrypted. Zero-knowledge architecture. What's yours stays yours, completely hidden from everyone—even us.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-8">
            <div className="space-y-2 xl:space-y-3 bg-zinc-900/50 p-4 xl:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <RiLockPasswordLine className="w-5 h-5 xl:w-6 xl:h-6 text-primary" />
              <h3 className="font-semibold text-zinc-200">Military-Grade</h3>
              <p className="text-sm text-zinc-400">AES-256-GCM encryption performed locally on your device.</p>
            </div>
            <div className="space-y-2 xl:space-y-3 bg-zinc-900/50 p-4 xl:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <RiMailLine className="w-5 h-5 xl:w-6 xl:h-6 text-emerald-400" />
              <h3 className="font-semibold text-zinc-200">Secure Sharing</h3>
              <p className="text-sm text-zinc-400">Expiring native links and OTP verifications for total control.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-[480px] xl:w-[540px] items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background shrink-0">
        {/* Mobile background elements (visible only on mobile) */}
        <div className="lg:hidden absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-[0%] right-[0%] w-[70%] h-[70%] rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-[0%] left-[0%] w-[60%] h-[60%] rounded-full bg-emerald-500 blur-[100px]" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="bg-primary/90 p-2 rounded-xl shadow-lg shadow-primary/20">
               <RiShieldKeyholeLine className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-heading font-bold tracking-tight">DocLocker</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-heading font-semibold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Enter your credentials to access your secure vault.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">Email</Label>
              <div className="relative">
                <RiMailLine className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70 z-10 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
                  {...register('email')}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive font-medium">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-medium">Password</Label>
              </div>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70 z-10 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
                  {...register('password')}
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive font-medium">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base font-medium mt-8 shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Log in securely'
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-10 text-center">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline hover:text-primary/80 transition-colors">
              Sign up securely
            </Link>
          </p>
        </div>
      </div>
      
      <PassphraseModal
        isOpen={modalState.isOpen}
        onUnlocked={handleUnlocked}
        encryptedPrivateKey={modalState.encryptedPrivateKey}
        keyDerivationSalt={modalState.keyDerivationSalt}
      />
    </div>
  );
}
