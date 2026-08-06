'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { RiUploadCloud2Line, RiCloseLine, RiInformationLine, RiCheckLine, RiErrorWarningLine } from '@remixicon/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/components/common/file-size';
import { useUploadStore } from '@/stores/upload-store';
import { useCryptoStore } from '@/stores/crypto-store';
import { useKeys } from '@/lib/api/hooks/use-auth';
import { useCreateDocument, useTriggerOcr } from '@/lib/api/hooks/use-documents';
import { encryptDocumentForUpload } from '@/lib/crypto';
import { docTypeValues } from '@/lib/api/schemas';
import { toast } from 'sonner';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId?: string | null;
}

const DOC_TYPES = docTypeValues;

async function uploadWithProgress(
  url: string,
  data: Uint8Array,
  mimeType: string,
  onProgress: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => resolve(xhr.status >= 200 && xhr.status < 300));
    xhr.addEventListener('error', () => resolve(false));
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.send(data as unknown as XMLHttpRequestBodyInit);
  });
}

export function UploadDialog({ open, onOpenChange, folderId }: UploadDialogProps) {
  const { items, addFiles, updateItem, removeItem, clearCompleted } = useUploadStore();
  const { data: keys } = useKeys();
  const createDoc = useCreateDocument();
  const triggerOcr = useTriggerOcr();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUploadAll = async () => {
    if (isUploading) return;
    if (!keys?.publicKey) {
      toast.error('Encryption keys not available. Please unlock your vault.');
      return;
    }

    const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    try {

    for (const item of pendingItems) {
      try {
        updateItem(item.id, { status: 'encrypting', progress: 10 });
        
        // 1. Read file & Encrypt
        const arrayBuffer = await item.file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);
        const { encryptedFileBytes, wrappedDekBase64, plaintextBase64 } = await encryptDocumentForUpload(fileBytes, keys.publicKey);
        
        updateItem(item.id, { status: 'creating', progress: 30 });
        
        // 2. Create Document record
        const title = item.title || item.file.name.replace(/\.[^/.]+$/, "");
        const newDoc = await createDoc.mutateAsync({
          title,
          docType: item.docType as any,
          mimeType: item.file.type || 'application/octet-stream',
          fileSizeBytes: encryptedFileBytes.length,
          wrappedDek: wrappedDekBase64,
          encryptionAlgo: 'AES-256-GCM',
          maxPrivacy: item.maxPrivacy,
          folderId: folderId || undefined,
        });

        updateItem(item.id, { status: 'uploading', progress: 40, documentId: (newDoc as any).document?.id || (newDoc as any).id });

        // 3. Upload to R2 with progress
        const uploadUrl = (newDoc as any).presignedUploadUrl;
        if (!uploadUrl) {
          throw new Error('Upload URL not provided');
        }

        const success = await uploadWithProgress(
          uploadUrl,
          encryptedFileBytes,
          item.file.type || 'application/octet-stream',
          (percent) => {
            // Scale progress from 40% to 80%
            updateItem(item.id, { progress: 40 + Math.floor(percent * 0.4) });
          }
        );

        if (!success) throw new Error('Failed to upload file to storage');

        // 4. OCR
        if (!item.maxPrivacy && plaintextBase64) {
          updateItem(item.id, { status: 'ocr', progress: 90 });
          await triggerOcr.mutateAsync({
            id: (newDoc as any).document?.id || (newDoc as any).id,
            plaintextBase64,
            mimeType: item.file.type || 'application/octet-stream'
          });
        }

        updateItem(item.id, { status: 'done', progress: 100 });
      } catch (err: any) {
        console.error('Upload error:', err);
        updateItem(item.id, { status: 'error', error: err.message || 'Upload failed' });
      }
    }
    } finally {
      setIsUploading(false);
    }
  };

  const pendingCount = items.filter(i => i.status !== 'done').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col h-full overflow-hidden p-0">
        <div className="p-6 border-b shrink-0">
          <SheetHeader>
            <SheetTitle>Upload Documents</SheetTitle>
            <SheetDescription>
              Drag and drop files here to encrypt and upload to your vault.
              {folderId && <span className="block mt-1 text-primary text-xs font-medium">📂 Uploading to current folder</span>}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
          >
            <input {...getInputProps()} />
            <RiUploadCloud2Line className="w-10 h-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to select files from your device
            </p>
          </div>

          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Selected Files ({items.length})</h4>
                <Button variant="ghost" size="sm" onClick={clearCompleted} className="h-8 text-xs">
                  Clear Completed
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 bg-card text-sm space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" title={item.file.name}>{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(item.file.size)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => removeItem(item.id)}>
                        <RiCloseLine className="w-4 h-4" />
                      </Button>
                    </div>

                    {item.status === 'pending' || item.status === 'error' ? (
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Select
                            value={item.docType}
                            onValueChange={(val) => val && updateItem(item.id, { docType: val })}
                          >
                            <SelectTrigger className="h-8 text-xs capitalize">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {DOC_TYPES.map(type => (
                                <SelectItem key={type} value={type} className="capitalize text-xs">{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1 text-xs cursor-help">
                                  <span>Max Privacy</span>
                                  <RiInformationLine className="w-3 h-3 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[200px] text-xs">
                                When enabled, your document won't be processed for text extraction (OCR). Search and auto-fill won't work for this doc, but the server never sees its contents — even temporarily.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Switch
                            checked={item.maxPrivacy}
                            onCheckedChange={(checked) => updateItem(item.id, { maxPrivacy: checked })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{item.status}</span>
                          <span>{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-1" />
                        {item.status === 'done' && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <RiCheckLine className="w-3 h-3 text-green-500" /> Upload Complete
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-background shrink-0">
          <Button 
            className="w-full" 
            onClick={handleUploadAll}
            disabled={pendingCount === 0 || !keys?.publicKey || isUploading}
          >
            {isUploading ? 'Uploading...' : pendingCount > 0 ? `Upload ${pendingCount} Files` : 'All Uploaded'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
