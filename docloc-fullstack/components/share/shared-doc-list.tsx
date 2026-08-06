'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RiFileTextLine, 
  RiImageLine, 
  RiFilePdfLine, 
  RiDownloadCloud2Line, 
  RiEyeLine,
  RiLockLine
} from '@remixicon/react';
import { SharedDocumentViewer, type SharedDocument } from './shared-document-viewer';
import { unwrapDekWithShareKey, decryptDocumentFile } from '@/lib/crypto';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

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
  const [activeViewerDoc, setActiveViewerDoc] = useState<SharedDocument | null>(null);

  const handleDownload = async (doc: SharedDocument) => {
    try {
      setDownloadingId(doc.documentId);
      
      // 1. Fetch encrypted file bytes
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

      // 2. Unwrap DEK using shareKey (base64url safe)
      const dek = unwrapDekWithShareKey(doc.wrappedDekForGrant, shareKey);

      // 3. Decrypt document content
      const decryptedData = await decryptDocumentFile(encryptedData, dek);
      
      const blob = new Blob([decryptedData as unknown as BlobPart], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      console.error('Failed to download shared document:', error);
      toast.error('Failed to decrypt document. Share key may be invalid.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => (
          <div 
            key={doc.documentId} 
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer gap-4"
            onClick={() => setActiveViewerDoc(doc)}
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="p-3 bg-primary/10 rounded-xl shrink-0 text-primary group-hover:scale-105 transition-transform">
                {doc.mimeType?.startsWith('image/') ? (
                  <RiImageLine className="h-6 w-6" />
                ) : doc.mimeType === 'application/pdf' ? (
                  <RiFilePdfLine className="h-6 w-6" />
                ) : (
                  <RiFileTextLine className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate text-base text-card-foreground group-hover:text-primary transition-colors">
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatFileSize(doc.fileSizeBytes)}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase px-1.5 py-0">
                    {doc.mimeType.split('/')[1] || 'FILE'}
                  </Badge>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                    <RiLockLine className="w-3 h-3" /> E2EE
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="outline" 
                className="gap-2 border-border/60 hover:bg-muted"
                onClick={() => setActiveViewerDoc(doc)}
              >
                <RiEyeLine className="w-4 h-4 text-primary" />
                Preview
              </Button>
              
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

      {/* Full-Screen Document Viewer matching Vault DocumentViewer */}
      <SharedDocumentViewer
        document={activeViewerDoc}
        documents={documents}
        isOpen={!!activeViewerDoc}
        onClose={() => setActiveViewerDoc(null)}
        onNavigate={(doc) => setActiveViewerDoc(doc)}
        shareKey={shareKey}
        accessType={accessType}
      />
    </>
  );
}
