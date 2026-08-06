"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RiShieldKeyholeLine,
  RiFolder3Line,
  RiShoppingCart2Line,
  RiShareForwardLine,
  RiSettings3Line,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Vault", href: "/vault", icon: RiShieldKeyholeLine },
  { label: "Buckets", href: "/buckets", icon: RiFolder3Line },
  { label: "Cart", href: "/cart", icon: RiShoppingCart2Line },
  { label: "Shares", href: "/shares", icon: RiShareForwardLine },
  { label: "Settings", href: "/settings", icon: RiSettings3Line },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 relative",
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground active:scale-95",
              )}
            >
              {/* Active Indicator Blob */}
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-xl -z-10" />
              )}
              
              <item.icon size={22} className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
