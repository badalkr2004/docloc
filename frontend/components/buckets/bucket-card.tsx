import { useMemo } from 'react';
import Link from 'next/link';
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

const typeConfig: Record<BucketType, { icon: any; color: string; label: string }> = {
  scholarship: { icon: RiGraduationCapLine, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Scholarship' },
  admission: { icon: RiSchoolLine, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Admission' },
  visa: { icon: RiPassportLine, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', label: 'Visa' },
  job_application: { icon: RiBriefcaseLine, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Job Application' },
  custom: { icon: RiFolder3Line, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', label: 'Custom' },
};

export function BucketCard({ bucket, onDelete, isDeleting }: BucketCardProps) {
  const config = typeConfig[bucket.type] || typeConfig.custom;
  const Icon = config.icon;
  const docCount = bucket.documents?.length || 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Card className="h-full flex flex-col group overflow-hidden transition-all hover:shadow-md border-border/50 hover:border-border">
        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${config.color.split(' ')[0]} dark:${config.color.split(' ')[2]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg line-clamp-1" title={bucket.name}>
                {bucket.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(bucket.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <AlertDialog>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                  <RiMore2Fill className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href={`/buckets/${bucket.id}`} className="cursor-pointer flex items-center">
                    <RiFolderOpenLine className="mr-2 h-4 w-4" />
                    Open Bucket
                  </Link>
                </DropdownMenuItem>
                {onDelete && (
                  <AlertDialogTrigger>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer flex items-center">
                      <RiDeleteBinLine className="mr-2 h-4 w-4" />
                      Delete Bucket
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Bucket</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the bucket "{bucket.name}"? This action cannot be undone.
                  The documents inside this bucket will not be deleted from your vault.
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
        </CardHeader>
        
        <CardContent className="pb-4 flex-1">
          {bucket.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
              {bucket.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic line-clamp-2 mt-1 min-h-[40px]">
              No description provided.
            </p>
          )}
        </CardContent>

        <CardFooter className="pt-0 flex items-center justify-between">
          <Badge variant="secondary" className={config.color + ' border-none font-medium'}>
            {config.label}
          </Badge>
          <div className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
            {docCount} {docCount === 1 ? 'doc' : 'docs'}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
