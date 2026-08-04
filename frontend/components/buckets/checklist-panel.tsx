'use client';

import { useBucketChecklist } from '@/lib/api/hooks/use-buckets';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RiCheckLine, RiCloseLine, RiSubtractLine } from '@remixicon/react';

interface ChecklistPanelProps {
  bucketId: string;
}

export function ChecklistPanel({ bucketId }: ChecklistPanelProps) {
  const { data: checklistData, isLoading, error } = useBucketChecklist(bucketId);
  const checklist = checklistData?.checklist || [];

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-2 w-full mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-24 h-4" />
              </div>
              <Skeleton className="w-16 h-6 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="p-4 text-center text-sm text-destructive">
        Failed to load checklist.
      </div>
    );
  }

  if (checklist.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
          <RiCheckLine className="w-6 h-6 text-muted-foreground/50" />
        </div>
        No checklist defined for this bucket.
      </div>
    );
  }

  const requiredItems = checklist.filter(item => item.required);
  const presentRequired = requiredItems.filter(item => item.present).length;
  const progressPercent = requiredItems.length > 0 
    ? (presentRequired / requiredItems.length) * 100 
    : 100;

  return (
    <div className="p-4 flex flex-col h-full space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-foreground">Completion</span>
          <span className="text-muted-foreground font-medium">
            {presentRequired} / {requiredItems.length} required
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4 space-y-2">
        {checklist.map((item, index) => {
          const isMissingRequired = item.required && !item.present;
          
          return (
            <div 
              key={index} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                item.present 
                  ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50' 
                  : isMissingRequired 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-background border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full flex-shrink-0 ${
                  item.present ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-secondary text-muted-foreground'
                }`}>
                  <DocTypeIcon docType={item.docType} className="w-4 h-4" />
                </div>
                
                <div className="flex flex-col">
                  <span className="text-sm font-medium capitalize">
                    {item.docType.replace('_', ' ')}
                  </span>
                  {item.required && (
                    <Badge variant="outline" className="text-[10px] w-fit px-1.5 h-4 mt-0.5 font-normal uppercase tracking-wider">
                      Required
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                {item.present ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                    <RiCheckLine className="w-3.5 h-3.5" />
                    Found
                  </div>
                ) : isMissingRequired ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                    <RiCloseLine className="w-3.5 h-3.5" />
                    Missing
                    <span className="flex w-2 h-2 rounded-full bg-destructive animate-pulse ml-1" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                    <RiSubtractLine className="w-3.5 h-3.5" />
                    Missing
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
