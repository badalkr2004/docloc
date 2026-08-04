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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
