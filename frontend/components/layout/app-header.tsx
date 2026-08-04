"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCryptoStore } from "@/stores/crypto-store";
import { useSession } from "@/lib/api/hooks/use-auth";
import { RiLockLine, RiLockUnlockLine, RiUserLine } from "@remixicon/react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AppHeader() {
  const isUnlocked = useCryptoStore((s) => s.isUnlocked);
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9 text-muted-foreground hover:text-foreground" />
      </div>

      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isUnlocked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                {isUnlocked ? <RiLockUnlockLine size={14} /> : <RiLockLine size={14} />}
                <span>{isUnlocked ? 'Vault Unlocked' : 'Locked'}</span>
              </div>
            } />
            <TooltipContent>
              {isUnlocked ? 'End-to-end encryption keys loaded in memory' : 'Passphrase required to decrypt documents'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {session?.user && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full border border-border/40">
            <RiUserLine size={14} />
            <span className="truncate max-w-[120px]">{session.user.name || session.user.email}</span>
          </div>
        )}
      </div>
    </header>
  );
}
