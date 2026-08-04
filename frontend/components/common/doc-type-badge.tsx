"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const docTypeConfig: Record<
  string,
  { label: string; className: string }
> = {
  aadhaar: {
    label: "Aadhaar",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  pan: {
    label: "PAN",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  passport: {
    label: "Passport",
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  marksheet: {
    label: "Marksheet",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  certificate: {
    label: "Certificate",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  income_proof: {
    label: "Income Proof",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  photo: {
    label: "Photo",
    className: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
  other: {
    label: "Other",
    className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
  },
};

interface DocTypeBadgeProps {
  docType: string;
  className?: string;
}

export function DocTypeBadge({ docType, className }: DocTypeBadgeProps) {
  const config = docTypeConfig[docType] || docTypeConfig.other;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
