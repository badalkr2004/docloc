'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { RiUserLine, RiMailLine, RiLockPasswordLine, RiShieldKeyholeLine, RiLoader4Line } from '@remixicon/react';

import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { generateUserKeyPair, encryptPrivateKeyWithPassphrase } from '@/lib/crypto';
import { useCryptoStore } from '@/stores/crypto-store';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const passphraseSchema = z.object({
  passphrase: z.string().min(8, 'Passphrase must be at least 8 characters'),
  confirmPassphrase: z.string(),
}).refine((data) => data.passphrase === data.confirmPassphrase, {
  message: "Passphrases don't match",
  path: ["confirmPassphrase"],
});

type SignupFormValues = z.infer<typeof signupSchema>;
type PassphraseFormValues = z.infer<typeof passphraseSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [signupData, setSignupData] = useState<SignupFormValues | null>(null);

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const passphraseForm = useForm<PassphraseFormValues>({
    resolver: zodResolver(passphraseSchema),
    defaultValues: {
      passphrase: '',
      confirmPassphrase: '',
    },
  });

  const onSignupSubmit = async (data: SignupFormValues) => {
    try {
      setIsLoading(true);
      await apiClient.post('/api/auth/sign-up/email', data);
      setSignupData(data);
      setStep(2);
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.message || 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onPassphraseSubmit = async (data: PassphraseFormValues) => {
    try {
      setIsLoading(true);
      
      // Generate keys and encrypt
      const keyPair = await generateUserKeyPair();
      const result = await encryptPrivateKeyWithPassphrase(keyPair.privateKeyBytes, data.passphrase);
      
      // Store encrypted keys on server
      await apiClient.post('/api/auth/keys', {
        publicKey: keyPair.publicKeyBase64,
        encryptedPrivateKey: result.encryptedBlob,
        keyDerivationSalt: result.saltBase64,
      });

      // Unlock store to keep them in memory for this session
      const unlock = useCryptoStore.getState().unlock;
      await unlock(result.encryptedBlob, result.saltBase64, data.passphrase);

      toast.success('Account created securely!');
      router.push('/vault');
    } catch (error: any) {
      console.error('Setup error:', error);
      toast.error(error.response?.data?.message || 'Failed to setup encryption. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Left Panel - Hidden on small screens */}
      <div className="hidden lg:flex flex-1 relative bg-zinc-950 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary blur-[120px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-emerald-600 blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-[50%] h-[50%] rounded-full bg-sky-600 blur-[100px]" />
        </div>
        <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative z-10 p-8 xl:p-12 text-white max-w-lg xl:max-w-xl">
          <div className="flex items-center gap-3 mb-8 xl:mb-12">
            <div className="bg-primary/90 p-2 xl:p-2.5 rounded-xl shadow-lg shadow-primary/20 backdrop-blur-md">
               <RiShieldKeyholeLine className="w-6 h-6 xl:w-8 xl:h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl xl:text-3xl font-heading font-bold tracking-tight">DocLocker</span>
          </div>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight mb-4 xl:mb-6">
            Join the new standard in document security.
          </h1>
          <p className="text-base xl:text-lg text-zinc-400 mb-8 xl:mb-12 font-medium">
            Create your zero-knowledge vault today. Experience true end-to-end encryption without sacrificing usability.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 xl:gap-8">
            <div className="space-y-2 xl:space-y-3 bg-zinc-900/50 p-4 xl:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <RiLockPasswordLine className="w-5 h-5 xl:w-6 xl:h-6 text-primary" />
              <h3 className="font-semibold text-zinc-200">Military-Grade</h3>
              <p className="text-sm text-zinc-400">AES-256-GCM encryption performed locally on your device.</p>
            </div>
            <div className="space-y-2 xl:space-y-3 bg-zinc-900/50 p-4 xl:p-5 rounded-2xl border border-white/5 backdrop-blur-sm">
              <RiShieldKeyholeLine className="w-5 h-5 xl:w-6 xl:h-6 text-sky-400" />
              <h3 className="font-semibold text-zinc-200">Zero-Knowledge</h3>
              <p className="text-sm text-zinc-400">We never see your files. Only you hold the decryption keys.</p>
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

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-10">
                  <h2 className="text-3xl font-heading font-semibold tracking-tight">Create Account</h2>
                  <p className="text-muted-foreground mt-2">Start securing your documents with end-to-end encryption.</p>
                </div>

                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-medium">Full Name</Label>
                    <div className="relative">
                      <RiUserLine className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70 z-10 pointer-events-none" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-10 h-11 bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
                        {...signupForm.register('name')}
                        disabled={isLoading}
                      />
                    </div>
                    {signupForm.formState.errors.name && (
                      <p className="text-sm text-destructive font-medium">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium">Email</Label>
                    <div className="relative">
                      <RiMailLine className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70 z-10 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10 h-11 bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
                        {...signupForm.register('email')}
                        disabled={isLoading}
                      />
                    </div>
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive font-medium">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-medium">Password</Label>
                    <div className="relative">
                      <RiLockPasswordLine className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70 z-10 pointer-events-none" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11 bg-background/50 backdrop-blur-sm transition-all focus:bg-background"
                        {...signupForm.register('password')}
                        disabled={isLoading}
                      />
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive font-medium">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-medium mt-8 shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>

                <p className="text-sm text-muted-foreground mt-10 text-center">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary font-medium hover:underline hover:text-primary/80 transition-colors">
                    Log in
                  </Link>
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="mb-10 text-center">
                  <div className="mx-auto bg-primary/10 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-6 shadow-inner">
                    <RiShieldKeyholeLine className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-3xl font-heading font-semibold tracking-tight">Encryption Keys</h2>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    Set a passphrase to encrypt your private key. <strong>It cannot be recovered if lost.</strong> This guarantees nobody but you can read your files.
                  </p>
                </div>

                <form onSubmit={passphraseForm.handleSubmit(onPassphraseSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="passphrase" className="font-medium">Encryption Passphrase</Label>
                    <Input
                      id="passphrase"
                      type="password"
                      placeholder="Enter a strong passphrase"
                      className="h-11 bg-background/50 backdrop-blur-sm focus:bg-background"
                      {...passphraseForm.register('passphrase')}
                      disabled={isLoading}
                    />
                    {passphraseForm.formState.errors.passphrase && (
                      <p className="text-sm text-destructive font-medium">{passphraseForm.formState.errors.passphrase.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassphrase" className="font-medium">Confirm Passphrase</Label>
                    <Input
                      id="confirmPassphrase"
                      type="password"
                      placeholder="Confirm your passphrase"
                      className="h-11 bg-background/50 backdrop-blur-sm focus:bg-background"
                      {...passphraseForm.register('confirmPassphrase')}
                      disabled={isLoading}
                    />
                    {passphraseForm.formState.errors.confirmPassphrase && (
                      <p className="text-sm text-destructive font-medium">{passphraseForm.formState.errors.confirmPassphrase.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-medium mt-8 shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RiLoader4Line className="mr-2 h-5 w-5 animate-spin" />
                        Setting up encryption...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
