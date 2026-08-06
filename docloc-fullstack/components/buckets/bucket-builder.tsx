'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RiShareForwardLine, 
  RiInboxLine,
  RiCloseLine,
  RiSettings4Line
} from '@remixicon/react';
import { useBucket, useRemoveDocFromBucket } from '@/lib/api/hooks/use-buckets';
import { useCreateCart, useAddBucketToCart } from '@/lib/api/hooks/use-carts';
import { VaultPicker } from './vault-picker';
import { ChecklistPanel } from './checklist-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { DocTypeBadge } from '@/components/common/doc-type-badge';
import { formatFileSize } from '@/components/common/file-size';
import { toast } from 'sonner';

export function BucketBuilder({ id }: { id: string }) {
  const router = useRouter();
  const { data: bucket, isLoading, error } = useBucket(id);
  const { mutate: removeDoc } = useRemoveDocFromBucket(id);
  const { mutateAsync: createCart } = useCreateCart();
  const { mutateAsync: addBucketToCart } = useAddBucketToCart();
  
  const [isSharing, setIsSharing] = useState(false);

  const existingDocIds = new Set(bucket?.documents?.map(d => d.id) || []);

  const handleRemove = (docId: string) => {
    removeDoc({ bucketId: id, documentId: docId }, {
      onSuccess: () => toast.success('Document removed from bucket'),
      onError: () => toast.error('Failed to remove document')
    });
  };

  const handleShare = async () => {
    if (!bucket || existingDocIds.size === 0) {
      toast.error('Add documents to the bucket before sharing');
      return;
    }

    try {
      setIsSharing(true);
      const cart = await createCart({
        label: `Cart from ${bucket.name}`,
      });
      
      await addBucketToCart({ cartId: cart.id, bucketId: id });
      
      toast.success('Bucket prepared for sharing');
      router.push('/cart');
    } catch (err) {
      toast.error('Failed to share bucket');
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="flex-1 flex gap-4">
          <Skeleton className="flex-[3] h-full rounded-lg" />
          <Skeleton className="flex-[2] h-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !bucket) {
    return (
      <div className="h-40 flex items-center justify-center flex-col text-destructive gap-2">
        <p>Failed to load bucket.</p>
        <Button variant="outline" onClick={() => router.push('/buckets')}>Go Back</Button>
      </div>
    );
  }

  const InBucketContent = () => (
    <div className="flex flex-col h-full bg-secondary/10">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <h3 className="font-medium text-sm flex items-center justify-between mb-2">
          <span>Bucket Contents ({bucket.documents?.length || 0})</span>
        </h3>
        
        {bucket.documents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
            <RiInboxLine className="w-8 h-8 mb-2 opacity-50" />
            <p>Bucket is empty.</p>
            <p className="text-xs">Add documents from the vault.</p>
          </div>
        ) : (
          bucket.documents?.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border shadow-sm group">
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                <DocTypeIcon docType={doc.docType} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate" title={doc.title}>{doc.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <DocTypeBadge docType={doc.docType} />
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(doc.fileSizeBytes)}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0"
                onClick={() => handleRemove(doc.id)}
              >
                <RiCloseLine className="w-5 h-5" />
              </Button>
            </div>
          ))
        )}
      </div>
      
      <div className="h-[45%] min-h-[300px] border-t bg-background">
        <ChecklistPanel bucketId={id} />
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-background border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <header className="px-6 py-4 border-b flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {bucket.name}
              <Badge variant="secondary" className="ml-2 capitalize hidden sm:inline-flex">
                {bucket.type.replace('_', ' ')}
              </Badge>
            </h1>
            {bucket.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {bucket.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            onClick={handleShare}
            disabled={isSharing || existingDocIds.size === 0}
            className="shadow-sm"
          >
            <RiShareForwardLine className="w-4 h-4 mr-2" />
            {isSharing ? 'Preparing...' : 'Share Bucket'}
          </Button>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={45} minSize={30} className="z-10 shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)]">
            <VaultPicker bucketId={id} existingDocIds={existingDocIds} />
          </ResizablePanel>
          <ResizableHandle withHandle className="w-1.5 bg-border/50 hover:bg-primary/50 transition-colors" />
          <ResizablePanel defaultSize={55} minSize={35}>
            <InBucketContent />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="in-bucket" className="h-full flex flex-col">
          <div className="px-4 pt-3 border-b">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="vault">Vault Picker</TabsTrigger>
              <TabsTrigger value="in-bucket">Bucket Contents</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="vault" className="flex-1 m-0 overflow-hidden">
            <VaultPicker bucketId={id} existingDocIds={existingDocIds} />
          </TabsContent>
          <TabsContent value="in-bucket" className="flex-1 m-0 overflow-hidden">
            <InBucketContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
