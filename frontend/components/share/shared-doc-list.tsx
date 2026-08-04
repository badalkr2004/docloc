'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RiFileTextLine, RiImageLine, RiFilePdfLine, RiDownloadCloud2Line, RiEyeLine } from '@remixicon/react';
import { base64ToBytes, unwrapDekWithShareKey, decryptDocumentFile } from '@/lib/crypto';
import { gcm } from '@noble/ciphers/aes.js';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface SharedDocument {
  documentId: string;
  title: string;
  mimeType: string;
  fileSizeBytes: number;
  wrappedDekForGrant: string;
  presignedUrl: string;
}

interface SharedDocListProps {
  documents: SharedDocument[];
  shareKey: string;
  accessType: 'view' | 'download';
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function SharedDocList({ documents, shareKey, accessType }: SharedDocListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<SharedDocument | null>(null);

  const processDocument = async (doc: SharedDocument): Promise<Blob | null> => {
    try {
      setDownloadingId(doc.documentId);
      
      // 1. Fetch encrypted blob
      let encryptedData: Uint8Array;
      if (doc.presignedUrl.startsWith('http://') || doc.presignedUrl.startsWith('https://')) {
        const res = await fetch(doc.presignedUrl);
        if (!res.ok) throw new Error('Failed to download encrypted file');
        const encryptedBlob = await res.blob();
        encryptedData = new Uint8Array(await encryptedBlob.arrayBuffer());
      } else {
        const res = await apiClient.get(doc.presignedUrl, { responseType: 'arraybuffer' });
        encryptedData = new Uint8Array(res.data);
      }

      // 2. Decode the wrapped DEK
      const wrappedDekCombined = base64ToBytes(doc.wrappedDekForGrant);
      const nonce = wrappedDekCombined.slice(0, 12);
      const ciphertext = wrappedDekCombined.slice(12);

      // 3. Decode shareKey
      const keyBytes = base64ToBytes(shareKey.replace(/-/g, '+').replace(/_/g, '/'));
      
      // 4. Unwrap DEK using shareKey
      const cipher = gcm(keyBytes, nonce);
      const dek = cipher.decrypt(ciphertext);

      // 5. Decrypt document content
      const decryptedData = await decryptDocumentFile(encryptedData, dek);
      
      return new Blob([decryptedData as unknown as BlobPart], { type: doc.mimeType });
    } catch (error) {
      console.error(error);
      toast.error('Failed to decrypt document');
      return null;
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownload = async (doc: SharedDocument) => {
    const blob = await processDocument(doc);
    if (!blob) return;

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handlePreview = async (doc: SharedDocument) => {
    const blob = await processDocument(doc);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewDoc(doc);
  };

  if (previewUrl && previewDoc) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="font-medium">{previewDoc.title}</div>
          <Button variant="outline" size="sm" onClick={() => {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewDoc(null);
          }}>
            Close Preview
          </Button>
        </div>
        <div className="bg-muted/30 border rounded-lg p-4 flex items-center justify-center min-h-[500px]">
          {previewDoc.mimeType.startsWith('image/') ? (
            <img src={previewUrl} alt={previewDoc.title} className="max-w-full max-h-[70vh] object-contain rounded-md shadow-sm" />
          ) : previewDoc.mimeType === 'application/pdf' ? (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded-md shadow-sm border-0" />
          ) : (
            <div className="text-center text-muted-foreground">
              Preview not available for this file type.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div key={doc.documentId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card shadow-sm gap-4">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-3 bg-primary/10 rounded-lg shrink-0">
              {doc.mimeType?.startsWith('image/') ? (
                <RiImageLine className="h-6 w-6 text-primary" />
              ) : doc.mimeType === 'application/pdf' ? (
                <RiFilePdfLine className="h-6 w-6 text-primary" />
              ) : (
                <RiFileTextLine className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-base">{doc.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatFileSize(doc.fileSizeBytes)} • {doc.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {(doc.mimeType.startsWith('image/') || doc.mimeType === 'application/pdf') && (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => handlePreview(doc)}
                disabled={downloadingId === doc.documentId}
              >
                <RiEyeLine className="w-4 h-4" />
                Preview
              </Button>
            )}
            
            {accessType === 'download' && (
              <Button 
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.documentId}
                className="gap-2"
              >
                <RiDownloadCloud2Line className="w-4 h-4" />
                {downloadingId === doc.documentId ? 'Decrypting...' : 'Download'}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
