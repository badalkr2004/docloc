'use client';

import React from 'react';
import { toast } from 'sonner';
import {
  RiBriefcaseLine,
  RiAddLine,
  RiFolder3Line,
  RiGraduationCapLine,
  RiPassportLine,
  RiSchoolLine
} from '@remixicon/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBuckets, useAddDocToBucket } from '@/lib/api/hooks/use-buckets';

interface AddToBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  scholarship: RiGraduationCapLine,
  admission: RiSchoolLine,
  visa: RiPassportLine,
  job_application: RiBriefcaseLine,
  custom: RiFolder3Line,
};

export function AddToBucketDialog({ open, onOpenChange, documentId, documentTitle }: AddToBucketDialogProps) {
  const { data: buckets = [], isLoading } = useBuckets();
  const { mutate: addDoc, isPending } = useAddDocToBucket();

  const handleAdd = (bucketId: string, bucketName: string) => {
    addDoc(
      { bucketId, documentId },
      {
        onSuccess: () => {
          toast.success(`Added "${documentTitle}" to ${bucketName}`);
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Failed to add document to bucket');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>Add to Bucket</DialogTitle>
          <DialogDescription>
            Select a bucket to add &quot;{documentTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading buckets...</div>
          ) : buckets.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No buckets created yet. Create a bucket from the Buckets page first.
            </div>
          ) : (
            buckets.map((bucket) => {
              const Icon = TYPE_ICONS[bucket.type] || RiFolder3Line;
              return (
                <div
                  key={bucket.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium truncate" title={bucket.name}>
                        {bucket.name}
                      </h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {bucket.type.replace('_', ' ')} • {(bucket as any).documentCount || 0} docs
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="ml-3 shrink-0 h-8"
                    disabled={isPending}
                    onClick={() => handleAdd(bucket.id, bucket.name)}
                  >
                    <RiAddLine className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
