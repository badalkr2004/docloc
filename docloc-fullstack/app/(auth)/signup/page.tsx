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
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <Card className="shadow-lg">
              <CardHeader className="space-y-2 text-center">
                <CardTitle className="text-3xl font-heading font-semibold">Create Account</CardTitle>
                <CardDescription>
                  Start securing your documents with end-to-end encryption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <RiUserLine className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-10"
                        {...signupForm.register('name')}
                        disabled={isLoading}
                      />
                    </div>
                    {signupForm.formState.errors.name && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <RiMailLine className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-10"
                        {...signupForm.register('email')}
                        disabled={isLoading}
                      />
                    </div>
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <RiLockPasswordLine className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10"
                        {...signupForm.register('password')}
                        disabled={isLoading}
                      />
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Log in
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-md"
          >
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="space-y-2 text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
                  <RiShieldKeyholeLine className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-heading font-semibold">Set your encryption passphrase</CardTitle>
                <CardDescription className="text-sm">
                  This passphrase protects your documents with end-to-end encryption. It's separate from your login password — if you lose it, your documents cannot be recovered.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={passphraseForm.handleSubmit(onPassphraseSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="passphrase">Encryption Passphrase</Label>
                    <Input
                      id="passphrase"
                      type="password"
                      placeholder="Enter a strong passphrase"
                      {...passphraseForm.register('passphrase')}
                      disabled={isLoading}
                    />
                    {passphraseForm.formState.errors.passphrase && (
                      <p className="text-sm text-destructive">{passphraseForm.formState.errors.passphrase.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassphrase">Confirm Passphrase</Label>
                    <Input
                      id="confirmPassphrase"
                      type="password"
                      placeholder="Confirm your passphrase"
                      {...passphraseForm.register('confirmPassphrase')}
                      disabled={isLoading}
                    />
                    {passphraseForm.formState.errors.confirmPassphrase && (
                      <p className="text-sm text-destructive">{passphraseForm.formState.errors.confirmPassphrase.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                        Setting up encryption...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
