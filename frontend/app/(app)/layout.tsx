"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PassphraseModal } from "@/components/auth/passphrase-modal";
import { useSession, useKeys } from "@/lib/api/hooks/use-auth";
import { useCryptoStore } from "@/stores/crypto-store";
import { MobileNav } from "@/components/layout/mobile-nav";

import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: keys, isLoading: keysLoading } = useKeys();
  const isUnlocked = useCryptoStore((s) => s.isUnlocked);
  const [showPassphrase, setShowPassphrase] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace("/login");
    }
  }, [session, sessionLoading, router]);

  useEffect(() => {
    if (
      !keysLoading &&
      keys &&
      keys.encryptedPrivateKey &&
      keys.keyDerivationSalt &&
      !isUnlocked
    ) {
      setShowPassphrase(true);
    }
  }, [keys, keysLoading, isUnlocked]);

  useEffect(() => {
    const handleOpenPassphrase = () => setShowPassphrase(true);
    document.addEventListener('open-passphrase-modal', handleOpenPassphrase);
    return () => document.removeEventListener('open-passphrase-modal', handleOpenPassphrase);
  }, []);

  if (sessionLoading || keysLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        <MobileNav />
      </SidebarInset>

      {keys?.encryptedPrivateKey && keys?.keyDerivationSalt && (
        <PassphraseModal
          isOpen={showPassphrase && !isUnlocked}
          onUnlocked={() => setShowPassphrase(false)}
          encryptedPrivateKey={keys.encryptedPrivateKey}
          keyDerivationSalt={keys.keyDerivationSalt}
        />
      )}
    </SidebarProvider>
  );
}
