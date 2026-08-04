'use client';

import { useState } from 'react';
import { useBuckets, useDeleteBucket } from '@/lib/api/hooks/use-buckets';
import { BucketCard } from '@/components/buckets/bucket-card';
import { BucketForm } from '@/components/buckets/bucket-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RiAddLine, RiFolder3Line } from '@remixicon/react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/empty-state';

export default function BucketsPage() {
  const { data: buckets, isLoading } = useBuckets();
  const { mutate: deleteBucket, isPending: isDeleting } = useDeleteBucket();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteBucket(id, {
      onSuccess: () => {
        toast.success('Bucket deleted');
        setDeletingId(null);
      },
      onError: () => {
        toast.error('Failed to delete bucket');
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="container py-4 sm:py-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Buckets</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Group documents for specific purposes like admissions, visas, or job applications.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} size="lg" className="shrink-0 w-full sm:w-auto">
          <RiAddLine className="w-5 h-5 mr-2" />
          Create Bucket
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 rounded-xl bg-card border p-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : buckets?.length === 0 ? (
        <div className="pt-10">
          <EmptyState
            icon={RiFolder3Line}
            title="No buckets yet"
            description="Create your first bucket to organize documents for a specific purpose and track missing requirements."
            action={
              <Button onClick={() => setIsFormOpen(true)}>
                Create Bucket
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {buckets?.map(bucket => (
            <BucketCard 
              key={bucket.id} 
              bucket={bucket} 
              onDelete={handleDelete}
              isDeleting={isDeleting && deletingId === bucket.id}
            />
          ))}
        </div>
      )}

      <BucketForm open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
