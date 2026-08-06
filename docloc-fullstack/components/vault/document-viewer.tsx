'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCryptoStore } from '@/stores/crypto-store';
import { unwrapDek, decryptDocumentFile, base64ToBytes } from '@/lib/crypto';
import { apiClient } from '@/lib/api/client';
import { useDocumentAudit } from '@/lib/api/hooks/use-documents';
import { DocTypeBadge } from '@/components/common/doc-type-badge';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { StatusBadge } from '@/components/common/status-badge';
import { formatFileSize } from '@/components/common/file-size';
import { formatDistanceToNow, format } from 'date-fns';
import type { Document } from '@/lib/api/schemas';
import {
  RiArrowLeftLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiDownloadLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiLockLine,
  RiShieldCheckLine,
  RiZoomInLine,
  RiZoomOutLine,
  RiHistoryLine,
  RiFileTextLine,
  RiEyeLine,
  RiEditLine,
} from '@remixicon/react';
import { EditDocumentDialog } from './edit-document-dialog';

interface DocumentViewerProps {
  document: Document | null;
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (doc: Document) => void;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const contentVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } },
};

const sidebarVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: '0%', opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2 } },
};

export function DocumentViewer({ document, documents, isOpen, onClose, onNavigate }: DocumentViewerProps) {
  const { secretKey } = useCryptoStore();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  // Derived properties
  const isImage = document?.mimeType?.startsWith('image/') || false;
  const isPdf = document?.mimeType === 'application/pdf';
  const fileExtension = document?.mimeType?.split('/')[1]?.toUpperCase() || 'FILE';

  // Current document index for navigation
  const currentIndex = document ? documents.findIndex(d => d.id === document.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < documents.length - 1;

  // Audit log for current document
  const { data: auditData } = useDocumentAudit(document?.id || '', 1);

  // Decrypt and load document
  useEffect(() => {
    if (!isOpen || !document) return;

    let mounted = true;
    let url: string | null = null;

    const loadDocument = async () => {
      if (!secretKey) {
        setBlobUrl(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });

      try {

        // 1. Fetch presigned download URL
        const downloadRes = await apiClient.get<{ presignedUrl?: string; downloadUrl?: string }>(
          `/api/documents/${document.id}/download`
        );
        const downloadUrl = downloadRes.data.presignedUrl || downloadRes.data.downloadUrl;
        if (!downloadUrl) throw new Error('Failed to get download URL from server');

        // 2. Fetch encrypted file bytes
        let arrayBuffer: ArrayBuffer;
        if (downloadUrl.startsWith('data:')) {
          const base64Data = downloadUrl.split(',')[1];
          arrayBuffer = base64ToBytes(base64Data).buffer as ArrayBuffer;
        } else if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
          const fileRes = await fetch(downloadUrl);
          if (!fileRes.ok) throw new Error('Failed to download encrypted file');
          arrayBuffer = await fileRes.arrayBuffer();
        } else {
          const fileRes = await apiClient.get(downloadUrl, { responseType: 'arraybuffer' });
          arrayBuffer = fileRes.data;
        }
        const encryptedBytes = new Uint8Array(arrayBuffer);

        // 3. Unwrap DEK & decrypt file
        const dek = await unwrapDek(document.wrappedDek, secretKey);
        const decryptedBuffer = decryptDocumentFile(encryptedBytes, dek);

        if (!mounted) return;

        // 4. Create Object URL
        const blob = new Blob([decryptedBuffer as any], { type: document.mimeType });
        url = URL.createObjectURL(blob);
        setBlobUrl(url);

        apiClient.post(`/api/documents/${document.id}/audit`, { action: 'view' }).catch(() => {});
      } catch (err: any) {
        if (!mounted) return;
        console.error('Failed to load document:', err);
        setError(err.message || 'Failed to decrypt document');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      mounted = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [document?.id, isOpen, secretKey]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onNavigate(documents[currentIndex - 1]);
      else if (e.key === 'ArrowRight' && hasNext) onNavigate(documents[currentIndex + 1]);
      else if (e.key === 'i' || e.key === 'I') setShowInfo(prev => !prev);
      else if (e.key === '=' || e.key === '+') setZoom(z => Math.min(z + 0.25, 5));
      else if (e.key === '-') setZoom(z => Math.max(z - 0.25, 0.25));
      else if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, currentIndex, documents, onClose, onNavigate]);

  // Mouse pan logic for images
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage || zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffset.current = { ...pan };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panOffset.current.x + dx, y: panOffset.current.y + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isImage) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.min(Math.max(z + delta, 0.25), 5));
  }, [isImage]);

  const handleDownload = () => {
    if (blobUrl && document) {
      const a = window.document.createElement('a');
      a.href = blobUrl;
      a.download = document.title;
      a.click();
    }
  };

  if (!document) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />

            {/* Top Toolbar */}
            <motion.header
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-10 flex items-center justify-between h-14 px-4 border-b border-border/40 bg-background/80 backdrop-blur-md shrink-0"
            >
              {/* Left: Back + Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={onClose}
                >
                  <RiArrowLeftLine className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-2.5 min-w-0">
                  <DocTypeIcon docType={document.docType} className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-sm font-semibold truncate">{document.title}</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {fileExtension} • {formatFileSize(document.fileSizeBytes)} • {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Center: Navigation */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onNavigate(documents[currentIndex - 1])}
                >
                  <RiArrowLeftSLine className="w-5 h-5" />
                </Button>
                <span className="text-xs text-muted-foreground px-1 font-mono tabular-nums">
                  {currentIndex + 1}/{documents.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={!hasNext}
                  onClick={() => hasNext && onNavigate(documents[currentIndex + 1])}
                >
                  <RiArrowRightSLine className="w-5 h-5" />
                </Button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isImage && (
                  <div className="hidden sm:flex items-center gap-0.5 mr-1 border rounded-full px-1 bg-muted/30">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}>
                      <RiZoomOutLine className="w-4 h-4" />
                    </Button>
                    <button
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                      className="text-xs text-muted-foreground font-mono tabular-nums px-1.5 hover:text-foreground transition-colors"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setZoom(z => Math.min(z + 0.25, 5))}>
                      <RiZoomInLine className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setShowEditDialog(true)}
                  title="Edit Document Details"
                >
                  <RiEditLine className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={handleDownload}
                  disabled={!blobUrl}
                >
                  <RiDownloadLine className="w-4 h-4" />
                </Button>

                <Button
                  variant={showInfo ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setShowInfo(prev => !prev)}
                >
                  <RiInformationLine className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={onClose}
                >
                  <RiCloseLine className="w-5 h-5" />
                </Button>
              </div>
            </motion.header>

            {/* Main Content Area */}
            <div className="relative flex-1 flex overflow-hidden">
              {/* Document Content */}
              <motion.div
                ref={contentRef}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 overflow-hidden flex items-center justify-center relative"
                onMouseDown={isImage ? handleMouseDown : undefined}
                onMouseMove={isImage ? handleMouseMove : undefined}
                onMouseUp={isImage ? handleMouseUp : undefined}
                onMouseLeave={isImage ? handleMouseUp : undefined}
                onWheel={isImage ? handleWheel : undefined}
                style={{ cursor: isImage && zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
              >
                {/* Subtle grid background */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }} />

                {loading && (
                  <div className="flex flex-col items-center gap-5 text-muted-foreground z-10">
                    <div className="relative">
                      <Skeleton className="w-64 h-80 rounded-xl" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <RiShieldCheckLine className="w-4 h-4 text-primary animate-pulse" />
                      <span>Securely decrypting document...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-xl border shadow-sm z-10 max-w-md text-center">
                    <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
                      <RiErrorWarningLine className="w-7 h-7 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">Failed to decrypt</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                    <Button variant="outline" onClick={onClose}>Go Back</Button>
                  </div>
                )}

                {!secretKey && (
                  <div className="flex flex-col items-center gap-6 p-12 bg-card rounded-2xl border shadow-lg max-w-sm text-center z-10">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <RiLockLine className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg mb-1">Vault is Locked</p>
                      <p className="text-sm text-muted-foreground">
                        Unlock your vault to securely decrypt and view this document.
                      </p>
                    </div>
                    <Button onClick={() => window.document.dispatchEvent(new CustomEvent('open-passphrase-modal'))} className="gap-2 w-full">
                      <RiLockLine className="w-4 h-4" /> Unlock Vault
                    </Button>
                  </div>
                )}

                {blobUrl && (
                  <div className="w-full h-full flex items-center justify-center z-10">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={blobUrl}
                        alt={document.title}
                        className="max-w-full max-h-full object-contain select-none transition-transform duration-100 rounded-lg shadow-2xl shadow-black/10"
                        style={{
                          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        }}
                        draggable={false}
                      />
                    ) : isPdf ? (
                      <iframe
                        src={`${blobUrl}#toolbar=1&navpanes=0`}
                        className="w-full h-full border-0"
                        title={document.title}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-6 p-12 bg-card rounded-2xl border shadow-lg max-w-sm text-center">
                        <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                          <RiFileTextLine className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg mb-1">{document.title}</p>
                          <p className="text-sm text-muted-foreground mb-1">
                            {fileExtension} • {formatFileSize(document.fileSizeBytes)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Preview not available for this file type
                          </p>
                        </div>
                        <Button onClick={handleDownload} className="gap-2">
                          <RiDownloadLine className="w-4 h-4" /> Download File
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Info Sidebar */}
              <AnimatePresence>
                {showInfo && (
                  <motion.aside
                    variants={sidebarVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-80 border-l border-border/40 bg-background/95 backdrop-blur-md overflow-y-auto shrink-0 hidden sm:block"
                  >
                    <div className="p-5 space-y-6">
                      {/* Document Details */}
                      <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <RiFileTextLine className="w-3.5 h-3.5" />
                          Details
                        </h3>
                        <div className="space-y-3">
                          <InfoRow label="Title" value={document.title} />
                          <InfoRow label="Type">
                            <DocTypeBadge docType={document.docType} />
                          </InfoRow>
                          <InfoRow label="Status">
                            <StatusBadge expiryDate={document.expiryDate} />
                          </InfoRow>
                          <InfoRow label="Size" value={formatFileSize(document.fileSizeBytes)} />
                          <InfoRow label="Format" value={fileExtension} />
                          {document.issueDate && (
                            <InfoRow label="Issue Date" value={format(new Date(document.issueDate), 'PP')} />
                          )}
                          {document.expiryDate && (
                            <InfoRow label="Expiry Date" value={format(new Date(document.expiryDate), 'PP')} />
                          )}
                        </div>
                      </section>

                      {/* Security Info */}
                      <Separator />
                      <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <RiShieldCheckLine className="w-3.5 h-3.5" />
                          Security
                        </h3>
                        <div className="space-y-3">
                          <InfoRow label="Algorithm" value={document.encryptionAlgo} />
                          <div className="flex items-center gap-2 text-sm">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <RiLockLine className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-xs">Client-Side Encrypted</p>
                              <p className="text-xs text-muted-foreground">AES-256-GCM authenticated</p>
                            </div>
                          </div>
                          {document.maxPrivacy && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <RiLockLine className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-xs">Max Privacy</p>
                                <p className="text-xs text-muted-foreground">No server-side processing</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </section>

                      {/* OCR Text */}
                      {document.ocrText && (
                        <>
                          <Separator />
                          <section>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <RiEyeLine className="w-3.5 h-3.5" />
                              Extracted Text
                            </h3>
                            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground max-h-40 overflow-y-auto font-mono leading-relaxed border">
                              {document.ocrText.slice(0, 500)}
                              {document.ocrText.length > 500 && '...'}
                            </div>
                          </section>
                        </>
                      )}

                      <Separator />

                      {/* Audit Trail */}
                      <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <RiHistoryLine className="w-3.5 h-3.5" />
                          Recent Activity
                        </h3>
                        <div className="space-y-2">
                          {auditData?.logs && auditData.logs.length > 0 ? (
                            auditData.logs.slice(0, 8).map((log: any) => (
                              <div key={log.id} className="flex items-center gap-2.5 py-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium capitalize">{log.action.replace('_', ' ')}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
                          )}
                        </div>
                      </section>

                      {/* Keyboard Shortcuts */}
                      <Separator />
                      <section>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                          Shortcuts
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                          <ShortcutKey keys="Esc" label="Close" />
                          <ShortcutKey keys="← →" label="Navigate" />
                          <ShortcutKey keys="I" label="Toggle info" />
                          <ShortcutKey keys="+ −" label="Zoom" />
                          <ShortcutKey keys="0" label="Reset zoom" />
                        </div>
                      </section>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <EditDocumentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        document={document}
      />
    </>
  );
}

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      {children || <span className="text-xs font-medium text-right truncate">{value}</span>}
    </div>
  );
}

function ShortcutKey({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border/50">{keys}</kbd>
      <span>{label}</span>
    </div>
  );
}
