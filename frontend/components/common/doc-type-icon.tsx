"use client";

import {
  RiFileTextLine,
  RiBankCardLine,
  RiPassportLine,
  RiGraduationCapLine,
  RiAwardLine,
  RiMoneyDollarCircleLine,
  RiCameraLine,
  RiFileLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  aadhaar: RiFileTextLine,
  pan: RiBankCardLine,
  passport: RiPassportLine,
  marksheet: RiGraduationCapLine,
  certificate: RiAwardLine,
  income_proof: RiMoneyDollarCircleLine,
  photo: RiCameraLine,
  other: RiFileLine,
};

const colorMap: Record<string, string> = {
  aadhaar: "text-orange-500",
  pan: "text-blue-500",
  passport: "text-indigo-500",
  marksheet: "text-emerald-500",
  certificate: "text-purple-500",
  income_proof: "text-amber-500",
  photo: "text-pink-500",
  other: "text-gray-500",
};

interface DocTypeIconProps {
  docType: string;
  className?: string;
  size?: number;
}

export function DocTypeIcon({
  docType,
  className,
  size = 20,
}: DocTypeIconProps) {
  const Icon = iconMap[docType] || iconMap.other;
  const color = colorMap[docType] || colorMap.other;

  return <Icon className={cn(color, className)} size={size} />;
}
