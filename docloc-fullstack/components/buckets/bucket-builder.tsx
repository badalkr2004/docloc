'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiShareForwardLine,
  RiInboxLine,
  RiCloseLine,
  RiLink,
  RiDownloadLine,
  RiWhatsappLine,
} from '@remixicon/react';
import { useBucket, useRemoveDocFromBucket } from '@/lib/api/hooks/use-buckets';
import { useCreateCart, useAddBucketToCart } from '@/lib/api/hooks/use-carts';
import { VaultPicker } from './vault-picker';
import { ChecklistPanel } from './checklist-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { DocTypeBadge } from '@/components/common/doc-type-badge';
import { formatFileSize } from '@/components/common/file-size';
import { toast } from 'sonner';
import { useCryptoStore } from '@/stores/crypto-store';
import { unwrapDek, decryptDocumentFile, base64ToBytes } from '@/lib/crypto';
import { apiClient } from '@/lib/api/client';

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  pdf: 'application/pdf',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function sanitizeFilename(title: string, mimeType: string): string {
  const cleaned = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'document';
  if (cleaned.includes('.')) return cleaned;
  const mime = (mimeType || '').split(';')[0].trim().toLowerCase();
  const fromMime = Object.entries(EXT_MIME).find(([, m]) => m === mime)?.[0];
  const fallback = mime.split('/')[1]?.split('+')[0] || 'bin';
  return `${cleaned}.${fromMime || fallback}`;
}

function normalizeMime(mimeType: string, filename: string): string {
  const mime = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (mime && mime !== 'application/octet-stream') return mime;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return EXT_MIME[ext] || 'application/octet-stream';
}

/** Build a File WhatsApp / Android share sheets accept (plain ArrayBuffer + real MIME). */
function toShareableFile(data: Uint8Array, title: string, mimeType: string): File {
  const filename = sanitizeFilename(title, mimeType);
  const type = normalizeMime(mimeType, filename);
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  const blob = new Blob([ab], { type });
  return new File([blob], filename, { type, lastModified: Date.now() });
}

function supportsNativeFileShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function BucketBuilder({ id }: { id: string }) {
  const router = useRouter();
  const { data: bucket, isLoading, error } = useBucket(id);
  const { mutate: removeDoc } = useRemoveDocFromBucket(id);
  const { mutateAsync: createCart } = useCreateCart();
  const { mutateAsync: addBucketToCart } = useAddBucketToCart();
  const { secretKey } = useCryptoStore();

  const [isSharing, setIsSharing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isOpeningShare, setIsOpeningShare] = useState(false);
  const [prepareProgress, setPrepareProgress] = useState({ done: 0, total: 0 });
  const [readyOpen, setReadyOpen] = useState(false);
  const [rightTab, setRightTab] = useState('contents');
  const [mobileTab, setMobileTab] = useState('contents');

  // Keep files in a ref so the Share Now tap always has the latest list
  const preparedFilesRef = useRef<File[]>([]);
  const [preparedCount, setPreparedCount] = useState(0);

  const existingDocIds = new Set(bucket?.documents?.map((d) => d.id) || []);
  const docCount = bucket?.documents?.length || 0;

  useEffect(() => {
    preparedFilesRef.current = [];
    setPreparedCount(0);
    setReadyOpen(false);
  }, [bucket?.documents]);

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
    const total = bucket.documents.length;
    setPrepareProgress({ done: 0, total });

    for (let i = 0; i < bucket.documents.length; i++) {
      const doc = bucket.documents[i];
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
      if (!decrypted.byteLength) throw new Error(`Decrypted file is empty: ${doc.title}`);

      files.push(toShareableFile(decrypted, doc.title, doc.mimeType));
      setPrepareProgress({ done: i + 1, total });
    }

    return files;
  };

  /** Step 1: decrypt offline. Do NOT call navigator.share here — gesture is already spent. */
  const handlePrepareNativeShare = async () => {
    if (!bucket || !bucket.documents || bucket.documents.length === 0) {
      toast.error('Add documents to the bucket before sharing');
      return;
    }
    if (!secretKey) {
      toast.error('Vault is locked. Please unlock first.');
      document.dispatchEvent(new CustomEvent('open-passphrase-modal'));
      return;
    }
    if (!supportsNativeFileShare()) {
      toast.error('This browser cannot open the system share sheet. Use Secure Link instead.');
      return;
    }

    try {
      setIsPreparing(true);
      toast.loading(
        `Decrypting ${bucket.documents.length} file${bucket.documents.length > 1 ? 's' : ''}…`,
        { id: 'native-share' }
      );

      const files = await decryptBucketFiles();
      if (files.length === 0) {
        toast.error('No files could be prepared for sharing', { id: 'native-share' });
        return;
      }

      preparedFilesRef.current = files;
      setPreparedCount(files.length);
      toast.dismiss('native-share');
      setReadyOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to prepare files for sharing', { id: 'native-share' });
      preparedFilesRef.current = [];
      setPreparedCount(0);
    } finally {
      setIsPreparing(false);
    }
  };

  /** Step 2: fresh user tap → open WhatsApp / system share sheet. */
  const handleOpenShareSheet = async () => {
    const files = preparedFilesRef.current;
    if (!files.length || !bucket) {
      toast.error('Files are not ready. Tap Native Share again.');
      setReadyOpen(false);
      return;
    }

    setIsOpeningShare(true);
    try {
      // Prefer sharing all files; if the device rejects the batch, try one-by-one.
      const tryShare = async (shareFiles: File[]) => {
        const data: ShareData = {
          files: shareFiles,
          title: bucket.name,
          text: bucket.name,
        };
        // Only block when canShare exists AND explicitly rejects this payload
        if (typeof navigator.canShare === 'function') {
          try {
            if (!navigator.canShare(data)) {
              throw new Error('FILE_SHARE_UNSUPPORTED');
            }
          } catch (e: any) {
            if (e?.message === 'FILE_SHARE_UNSUPPORTED') throw e;
            // Some browsers throw from canShare — still attempt share()
          }
        }
        await navigator.share(data);
      };

      try {
        await tryShare(files);
        setReadyOpen(false);
        toast.success('Share sheet opened');
      } catch (batchErr: any) {
        if (batchErr?.name === 'AbortError') return;

        // Batch rejected (common on WhatsApp with many files) — share first file, hint for rest
        if (files.length > 1) {
          try {
            await tryShare([files[0]]);
            toast.message(
              `Shared 1 of ${files.length}. Tap Share again for the next file, or use Secure Link for the full set.`,
              { duration: 6000 }
            );
            preparedFilesRef.current = files.slice(1);
            setPreparedCount(files.length - 1);
            return;
          } catch (singleErr: any) {
            if (singleErr?.name === 'AbortError') return;
            throw singleErr;
          }
        }
        throw batchErr;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error(err);
      const msg = String(err?.message || err || '');
      if (msg.includes('FILE_SHARE_UNSUPPORTED') || /no files|permission|notallowed/i.test(msg)) {
        toast.error(
          'This device could not attach the files. Download them below, or use Secure Link.',
          { duration: 6000 }
        );
      } else {
        toast.error(msg || 'Could not open share sheet');
      }
    } finally {
      setIsOpeningShare(false);
    }
  };

  const handleDownloadPrepared = () => {
    const files = preparedFilesRef.current;
    if (!files.length) return;
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
    toast.success(`Downloading ${files.length} file${files.length > 1 ? 's' : ''}…`);
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
            onClick={handlePrepareNativeShare}
            disabled={isPreparing || docCount === 0}
            className="shadow-sm"
          >
            <RiShareForwardLine className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">
              {isPreparing
                ? `Decrypting ${prepareProgress.done}/${prepareProgress.total || '…'}`
                : 'Share'}
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
            <TabsContent
              value="contents"
              className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <BucketContentsList />
            </TabsContent>
            <TabsContent
              value="checklist"
              className="flex-1 m-0 min-h-0 overflow-auto data-[state=inactive]:hidden"
            >
              <ChecklistPanel bucketId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
          <TabsContent
            value="vault"
            className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden"
          >
            <VaultPicker bucketId={id} existingDocIds={existingDocIds} />
          </TabsContent>
          <TabsContent
            value="contents"
            className="flex-1 m-0 min-h-0 overflow-hidden data-[state=inactive]:hidden"
          >
            <BucketContentsList />
          </TabsContent>
          <TabsContent
            value="checklist"
            className="flex-1 m-0 min-h-0 overflow-auto data-[state=inactive]:hidden"
          >
            <ChecklistPanel bucketId={id} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={readyOpen} onOpenChange={setReadyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to share</DialogTitle>
            <DialogDescription>
              {preparedCount} decrypted file{preparedCount !== 1 ? 's' : ''} ready. Tap the button
              below to open WhatsApp, Files, or your system share sheet.
              {preparedCount > 1 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Some apps (including WhatsApp) only accept one file at a time — we&apos;ll share
                  the next file after each send if needed.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {preparedFilesRef.current.slice(0, 5).map((f) => (
              <div key={f.name + f.size} className="truncate py-0.5">
                {f.name}
              </div>
            ))}
            {preparedCount > 5 && (
              <div className="text-xs pt-1">+{preparedCount - 5} more</div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleOpenShareSheet}
              disabled={isOpeningShare || preparedCount === 0}
            >
              <RiWhatsappLine className="w-5 h-5" />
              {isOpeningShare
                ? 'Opening…'
                : preparedCount > 1
                  ? `Share next file (${preparedCount} left)`
                  : 'Share via WhatsApp & apps'}
            </Button>
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleDownloadPrepared}
                disabled={preparedCount === 0}
              >
                <RiDownloadLine className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="secondary"
                className="flex-1 gap-2"
                onClick={() => {
                  setReadyOpen(false);
                  handleShare();
                }}
              >
                <RiLink className="w-4 h-4" />
                Secure Link
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
