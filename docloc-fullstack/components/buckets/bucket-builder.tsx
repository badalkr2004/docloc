'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiShareForwardLine,
  RiInboxLine,
  RiCloseLine,
  RiLink,
} from '@remixicon/react';
import { useBucket, useRemoveDocFromBucket } from '@/lib/api/hooks/use-buckets';
import { useCreateCart, useAddBucketToCart } from '@/lib/api/hooks/use-carts';
import { VaultPicker } from './vault-picker';
import { ChecklistPanel } from './checklist-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { DocTypeBadge } from '@/components/common/doc-type-badge';
import { formatFileSize } from '@/components/common/file-size';
import { toast } from 'sonner';
import { useCryptoStore } from '@/stores/crypto-store';
import { unwrapDek, decryptDocumentFile, base64ToBytes } from '@/lib/crypto';
import { apiClient } from '@/lib/api/client';

/** Mobile Web Share needs a plain ArrayBuffer-backed File, not a TypedArray view. */
function toShareableFile(data: Uint8Array, filename: string, mimeType: string): File {
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const type = mimeType || 'application/octet-stream';
  return new File([ab], filename, { type, lastModified: Date.now() });
}

export function BucketBuilder({ id }: { id: string }) {
  const router = useRouter();
  const { data: bucket, isLoading, error } = useBucket(id);
  const { mutate: removeDoc } = useRemoveDocFromBucket(id);
  const { mutateAsync: createCart } = useCreateCart();
  const { mutateAsync: addBucketToCart } = useAddBucketToCart();
  const { secretKey } = useCryptoStore();

  const [isSharing, setIsSharing] = useState(false);
  const [isNativeSharing, setIsNativeSharing] = useState(false);
  const [rightTab, setRightTab] = useState('contents');
  const [mobileTab, setMobileTab] = useState('contents');

  const existingDocIds = new Set(bucket?.documents?.map((d) => d.id) || []);
  const docCount = bucket?.documents?.length || 0;

  const handleRemove = (docId: string) => {
    removeDoc(
      { bucketId: id, documentId: docId },
      {
        onSuccess: () => toast.success('Document removed from bucket'),
        onError: () => toast.error('Failed to remove document'),
      }
    );
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
    } catch {
      toast.error('Failed to share bucket');
      setIsSharing(false);
    }
  };

  const decryptBucketFiles = async (): Promise<File[]> => {
    if (!bucket?.documents?.length || !secretKey) return [];

    const files: File[] = [];

    for (const doc of bucket.documents) {
      const downloadRes = await apiClient.get<{
        presignedUrl?: string;
        downloadUrl?: string;
      }>(`/api/documents/${doc.id}/download`);
      const downloadUrl = downloadRes.data.presignedUrl || downloadRes.data.downloadUrl;
      if (!downloadUrl) throw new Error(`Failed to get download URL for ${doc.title}`);

      let arrayBuffer: ArrayBuffer;
      if (downloadUrl.startsWith('data:')) {
        const base64Data = downloadUrl.split(',')[1];
        arrayBuffer = base64ToBytes(base64Data).buffer as ArrayBuffer;
      } else if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
        const fileRes = await fetch(downloadUrl);
        if (!fileRes.ok) throw new Error(`Failed to download ${doc.title}`);
        arrayBuffer = await fileRes.arrayBuffer();
      } else {
        const fileRes = await apiClient.get(downloadUrl, { responseType: 'arraybuffer' });
        arrayBuffer = fileRes.data;
      }

      const dek = unwrapDek(doc.wrappedDek, secretKey);
      const decrypted = decryptDocumentFile(new Uint8Array(arrayBuffer), dek);

      const extension = doc.mimeType?.split('/')[1]?.split(';')[0] || 'bin';
      const filename = doc.title.includes('.') ? doc.title : `${doc.title}.${extension}`;
      files.push(toShareableFile(decrypted, filename, doc.mimeType));
    }

    return files;
  };

  const handleNativeShareBucket = async () => {
    if (!bucket || !bucket.documents || bucket.documents.length === 0) {
      toast.error('Add documents to the bucket before sharing');
      return;
    }
    if (!secretKey) {
      toast.error('Vault is locked. Please unlock first.');
      document.dispatchEvent(new CustomEvent('open-passphrase-modal'));
      return;
    }
    if (!navigator.share) {
      toast.error('Native sharing is not supported on this browser/device.');
      return;
    }

    try {
      setIsNativeSharing(true);
      toast.loading(`Decrypting ${bucket.documents.length} file${bucket.documents.length > 1 ? 's' : ''}…`, {
        id: 'native-share',
      });

      const files = await decryptBucketFiles();
      if (files.length === 0) {
        toast.error('No files could be prepared for sharing', { id: 'native-share' });
        return;
      }

      toast.dismiss('native-share');

      // Share in the same click handler after decrypt — two-step "prepare then Share Now"
      // loses the user gesture on mobile and surfaces "no files to share".
      const payload = { files, title: bucket.name };
      if (typeof navigator.canShare === 'function' && !navigator.canShare(payload)) {
        toast.error(
          'These files cannot be shared natively on this device. Use Secure Link instead.',
          { duration: 5000 }
        );
        return;
      }

      await navigator.share(payload);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('no files') || msg.includes('share') || msg.includes('permission')) {
          toast.error(
            'Could not open the share sheet. Try Secure Link, or share fewer/smaller files.',
            { id: 'native-share', duration: 5000 }
          );
        } else {
          toast.error(err.message || 'Failed to share files', { id: 'native-share' });
        }
      } else {
        toast.dismiss('native-share');
      }
    } finally {
      setIsNativeSharing(false);
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
        <Button variant="outline" onClick={() => router.push('/buckets')}>
          Go Back
        </Button>
      </div>
    );
  }

  const BucketContentsList = () => (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b shrink-0 flex items-center justify-between gap-2">
        <h3 className="font-medium text-sm">
          In this bucket
          <span className="ml-2 text-muted-foreground font-normal">({docCount})</span>
        </h3>
      </div>
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-2">
        {docCount === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] border-2 border-dashed rounded-xl text-muted-foreground text-sm px-4 text-center">
            <RiInboxLine className="w-8 h-8 mb-2 opacity-50" />
            <p className="font-medium text-foreground/80">Bucket is empty</p>
            <p className="text-xs mt-1 max-w-xs">
              Use the vault picker to add documents. They stay encrypted in your vault —
              buckets only reference them.
            </p>
          </div>
        ) : (
          bucket.documents?.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-sm group"
            >
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                <DocTypeIcon docType={doc.docType} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate" title={doc.title}>
                  {doc.title}
                </h4>
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
                className="text-muted-foreground hover:text-destructive h-8 w-8 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(doc.id)}
                aria-label={`Remove ${doc.title}`}
              >
                <RiCloseLine className="w-5 h-5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-8rem)] flex flex-col bg-background border rounded-xl overflow-hidden shadow-sm">
      <header className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between gap-3 bg-card shrink-0">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate">
            <span className="truncate">{bucket.name}</span>
            <Badge variant="secondary" className="capitalize hidden sm:inline-flex shrink-0">
              {bucket.type.replace('_', ' ')}
            </Badge>
          </h1>
          {bucket.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{bucket.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNativeShareBucket}
            disabled={isNativeSharing || docCount === 0}
            className="shadow-sm"
          >
            <RiShareForwardLine className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {isNativeSharing ? 'Preparing…' : 'Native Share'}
            </span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleShare}
            disabled={isSharing || docCount === 0}
            className="shadow-sm"
          >
            <RiLink className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{isSharing ? 'Preparing…' : 'Secure Link'}</span>
          </Button>
        </div>
      </header>

      {/* Desktop: vault picker | tabbed contents/checklist (full height) */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[42%] min-w-[280px] max-w-[480px] border-r flex flex-col min-h-0">
          <VaultPicker bucketId={id} existingDocIds={existingDocIds} />
        </div>
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full min-h-0">
            <div className="px-4 pt-3 border-b shrink-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="contents">
                  Contents{docCount > 0 ? ` (${docCount})` : ''}
                </TabsTrigger>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="contents" className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
              <BucketContentsList />
            </TabsContent>
            <TabsContent value="checklist" className="flex-1 m-0 min-h-0 overflow-auto data-[state=inactive]:hidden">
              <ChecklistPanel bucketId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile: Add | Contents | Checklist — one full-height pane at a time */}
      <div className="md:hidden flex-1 min-h-0 overflow-hidden flex flex-col">
        <Tabs value={mobileTab} onValueChange={setMobileTab} className="h-full flex flex-col min-h-0">
          <div className="px-3 pt-2 border-b shrink-0">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="vault" className="text-xs sm:text-sm">
                Add
              </TabsTrigger>
              <TabsTrigger value="contents" className="text-xs sm:text-sm">
                Contents{docCount > 0 ? ` (${docCount})` : ''}
              </TabsTrigger>
              <TabsTrigger value="checklist" className="text-xs sm:text-sm">
                Checklist
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="vault" className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
            <VaultPicker bucketId={id} existingDocIds={existingDocIds} />
          </TabsContent>
          <TabsContent value="contents" className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden">
            <BucketContentsList />
          </TabsContent>
          <TabsContent value="checklist" className="flex-1 m-0 min-h-0 overflow-auto data-[state=inactive]:hidden">
            <ChecklistPanel bucketId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
