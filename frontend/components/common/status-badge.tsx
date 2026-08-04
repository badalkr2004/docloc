"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  expiryDate: string | null;
  className?: string;
}

export function StatusBadge({ expiryDate, className }: StatusBadgeProps) {
  if (!expiryDate) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-status-verified/30 bg-status-verified/10 text-status-verified",
          className,
        )}
      >
        Active
      </Badge>
    );
  }

  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysUntilExpiry < 0) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-status-expired/30 bg-status-expired/10 text-status-expired",
          className,
        )}
      >
        Expired
      </Badge>
    );
  }

  if (daysUntilExpiry <= 30) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-status-expiring/30 bg-status-expiring/10 text-status-expiring",
          className,
        )}
      >
        Expiring soon
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-status-verified/30 bg-status-verified/10 text-status-verified",
        className,
      )}
    >
      Valid
    </Badge>
  );
}
