'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import {
  RiGraduationCapLine,
  RiSchoolLine,
  RiPassportLine,
  RiBriefcaseLine,
  RiFolder3Line,
  RiMore2Fill,
  RiDeleteBinLine,
  RiFolderOpenLine,
  RiFileTextLine,
  RiArrowRightLine,
} from '@remixicon/react';
import { Bucket, BucketType } from '@/lib/api/schemas';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BucketCardProps {
  bucket: Bucket & { documents?: any[] };
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

const typeConfig: Record<BucketType, { 
  icon: any; 
  gradient: string;
  badgeBg: string;
  badgeText: string;
  label: string;
}> = {
  scholarship: {
    icon: RiGraduationCapLine,
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-500',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    badgeText: 'text-emerald-500',
    label: 'Scholarship',
  },
  admission: {
    icon: RiSchoolLine,
    gradient: 'from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/30 text-blue-500',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    badgeText: 'text-blue-500',
    label: 'Admission',
  },
  visa: {
    icon: RiPassportLine,
    gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent border-indigo-500/30 text-indigo-500',
    badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    badgeText: 'text-indigo-500',
    label: 'Visa',
  },
  job_application: {
    icon: RiBriefcaseLine,
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/30 text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    badgeText: 'text-amber-500',
    label: 'Job Application',
  },
  custom: {
    icon: RiFolder3Line,
    gradient: 'from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/30 text-purple-500',
    badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    badgeText: 'text-purple-500',
    label: 'Custom',
  },
};

export function BucketCard({ bucket, onDelete, isDeleting }: BucketCardProps) {
  const router = useRouter();
  const config = typeConfig[bucket.type] || typeConfig.custom;
  const Icon = config.icon;
  const docCount = bucket.documentCount ?? bucket.documents?.length ?? 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full"
    >
      <Card 
        onClick={() => router.push(`/buckets/${bucket.id}`)}
        className="h-full flex flex-col group cursor-pointer overflow-hidden transition-all duration-300 border-border/60 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 relative bg-gradient-to-b from-card via-card to-muted/20"
      >
        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0 relative z-10">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className={`p-2.5 rounded-xl border ${config.gradient} shadow-sm shrink-0 flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors" title={bucket.name}>
                {bucket.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                Created {formatDistanceToNow(new Date(bucket.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="stop-card-click shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg">
                    <RiMore2Fill className="h-4 w-4" />
                  </Button>
                } />
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/buckets/${bucket.id}`); }}>
                    <RiFolderOpenLine className="mr-2 h-4 w-4 text-primary" />
                    Open Bucket
                  </DropdownMenuItem>
                  {onDelete && (
                    <AlertDialogTrigger>
                      <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                        <RiDeleteBinLine className="mr-2 h-4 w-4" />
                        Delete Bucket
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Bucket</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{bucket.name}&quot;? This action cannot be undone.
                    The documents inside this bucket will remain safe in your vault.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete?.(bucket.id)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4 flex-1">
          {bucket.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px] leading-relaxed">
              {bucket.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/50 italic line-clamp-2 min-h-[40px] leading-relaxed">
              No description provided.
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t border-border/40 flex items-center justify-between mt-auto bg-muted/10">
          <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold rounded-md border ${config.badgeBg}`}>
            {config.label}
          </Badge>
          
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 dark:bg-muted/30 px-2.5 py-1 rounded-md border border-border/40 group-hover:border-primary/30 transition-colors">
            <RiFileTextLine className={`w-3.5 h-3.5 ${config.badgeText}`} />
            <span>{docCount} {docCount === 1 ? 'doc' : 'docs'}</span>
            <RiArrowRightLine className="w-3 h-3 ml-0.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
