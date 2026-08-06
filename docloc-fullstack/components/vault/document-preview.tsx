'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCryptoStore } from '@/stores/crypto-store';
import { unwrapDek, decryptDocumentFile } from '@/lib/crypto';
import { apiClient } from '@/lib/api/client';
import type { Document } from '@/lib/api/schemas';
import { RiDownloadLine, RiErrorWarningLine } from '@remixicon/react';

interface DocumentPreviewProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreview({ document, isOpen, onClose }: DocumentPreviewProps) {
  const { secretKey } = useCryptoStore();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !document) return;

    let mounted = true;
    let url: string | null = null;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl(null);

      try {
        if (!secretKey) throw new Error('Vault is locked. Please unlock first.');

        // 1. Get download URL
        const res = await apiClient.get<{ presignedUrl?: string; downloadUrl?: string; url?: string }>(`/api/documents/${document.id}/download`);
        const downloadUrl = res.data.presignedUrl || res.data.downloadUrl || res.data.url;
        if (!downloadUrl) throw new Error('Download URL not provided by server');

        // 2. Download encrypted bytes
        let arrayBuffer: ArrayBuffer;
        if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
          const fileRes = await fetch(downloadUrl);
          if (!fileRes.ok) throw new Error('Failed to download encrypted file');
          arrayBuffer = await fileRes.arrayBuffer();
        } else {
          const fileRes = await apiClient.get(downloadUrl, { responseType: 'arraybuffer' });
          arrayBuffer = fileRes.data;
        }
        const encryptedBytes = new Uint8Array(arrayBuffer);

        // 3. Unwrap DEK & Decrypt
        const dek = await unwrapDek(document.wrappedDek, secretKey);
        const decryptedBytes = await decryptDocumentFile(encryptedBytes, dek);

        // 4. Create Object URL
        const blob = new Blob([decryptedBytes as unknown as BlobPart], { type: document.mimeType });
        url = URL.createObjectURL(blob);

        if (mounted) {
          setBlobUrl(url);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to decrypt document');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      mounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [isOpen, document, secretKey]);

  if (!document) return null;

  const isImage = document.mimeType.startsWith('image/');
  const isPdf = document.mimeType === 'application/pdf';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0 bg-background/95 backdrop-blur">
          <DialogTitle>{document.title}</DialogTitle>
          <DialogDescription>Previewing securely decrypted document</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
          {loading && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Skeleton className="w-[300px] h-[400px] rounded-lg" />
              <p className="text-sm animate-pulse">Securely decrypting file...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <RiErrorWarningLine className="w-10 h-10" />
              <p>{error}</p>
            </div>
          )}

          {blobUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {isImage ? (
                <img src={blobUrl} alt={document.title} className="max-w-full max-h-full object-contain rounded-md shadow-sm" />
              ) : isPdf ? (
                <iframe src={`${blobUrl}#toolbar=0`} className="w-full h-full rounded-md shadow-sm border-0" title={document.title} />
              ) : (
                <div className="flex flex-col items-center gap-4 p-8 bg-background rounded-lg border shadow-sm">
                  <p className="text-muted-foreground">Preview not available for this file type.</p>
                  <a href={blobUrl} download={document.title}>
                    <Button>
                      <RiDownloadLine className="mr-2 h-4 w-4" /> Download File
                    </Button>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
