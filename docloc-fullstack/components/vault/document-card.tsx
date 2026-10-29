'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import {
  RiEyeLine,
  RiFolderAddLine,
  RiShoppingCartLine,
  RiDeleteBinLine,
  RiMoreLine,
  RiFolderTransferLine,
  RiEditLine,
} from '@remixicon/react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSelectionStore } from '@/stores/selection-store';
import { useDeleteDocument } from '@/lib/api/hooks/use-documents';
import { useAddDocToCart } from '@/lib/api/hooks/use-carts';
import { DocTypeBadge } from '@/components/common/doc-type-badge';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { StatusBadge } from '@/components/common/status-badge';
import { formatFileSize } from '@/components/common/file-size';
import type { Document } from '@/lib/api/schemas';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoveDialog } from './move-dialog';
import { AddToBucketDialog } from './add-to-bucket-dialog';
import { EditDocumentDialog } from './edit-document-dialog';

interface DocumentCardProps {
  document: Document;
  viewMode: 'grid' | 'list';
  onPreview?: (doc: Document) => void;
}

export function DocumentCard({ document, viewMode, onPreview }: DocumentCardProps) {
  const { selectedIds, toggle, isSelecting } = useSelectionStore();
  const isSelected = selectedIds.has(document.id);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showBucketDialog, setShowBucketDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const deleteDoc = useDeleteDocument();
  const addToCart = useAddDocToCart();

  const handleDelete = () => {
    deleteDoc.mutate(document.id, {
      onSuccess: () => {
        toast.success('Document deleted');
        setShowDeleteConfirm(false);
      },
    });
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addToCart.mutateAsync({ documentId: document.id });
      toast.success(`Added "${document.title}" to cart`);
    } catch {
      toast.error('Failed to add to cart');
    }
  };

  const openPreview = () => onPreview?.(document);
  const isGrid = viewMode === 'grid';
  const showCheckbox = isSelecting || isSelected;

  const expiryWarn = (() => {
    if (!document.expiryDate) return null;
    const daysLeft = Math.ceil(
      (new Date(document.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft > 0 && daysLeft <= 30) {
      return (
        <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0">
          {daysLeft}d left
        </span>
      );
    }
    return null;
  })();

  const menu = (
    <div className="stop-card-click shrink-0" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <RiMoreLine className="w-4 h-4 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowEditDialog(true);
            }}
          >
            <RiEditLine className="w-4 h-4 mr-2" />
            Edit Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowBucketDialog(true);
            }}
          >
            <RiFolderAddLine className="w-4 h-4 mr-2" />
            Add to Bucket
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowMoveDialog(true);
            }}
          >
            <RiFolderTransferLine className="w-4 h-4 mr-2" />
            Move to Folder
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            <RiDeleteBinLine className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const meta = (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      <DocTypeBadge docType={document.docType} />
      <StatusBadge expiryDate={document.expiryDate} />
      {expiryWarn}
      <span className="text-[10px] text-muted-foreground font-mono truncate">
        {formatFileSize(document.fileSizeBytes)} ·{' '}
        {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
      </span>
    </div>
  );

  const quickActions = (
    <div className="stop-card-click flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-sky-600 dark:text-sky-400"
        title="Preview"
        onClick={(e) => {
          e.stopPropagation();
          openPreview();
        }}
      >
        <RiEyeLine className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-amber-600 dark:text-amber-400"
        title="Add to bucket"
        onClick={(e) => {
          e.stopPropagation();
          setShowBucketDialog(true);
        }}
      >
        <RiFolderAddLine className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-emerald-600 dark:text-emerald-400"
        title="Add to cart"
        onClick={handleAddToCart}
        disabled={addToCart.isPending}
      >
        <RiShoppingCartLine className="w-4 h-4" />
      </Button>
      {menu}
    </div>
  );

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
      >
        <div
          className="group relative cursor-pointer"
          draggable
          onDragStart={(e: React.DragEvent) => {
            e.dataTransfer.setData('text/plain', document.id);
            e.dataTransfer.setData('documentId', document.id);
            e.dataTransfer.setData('application/x-docloc-document', document.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('.stop-card-click')) return;
            if (isSelecting) {
              toggle(document.id);
              return;
            }
            openPreview();
          }}
        >
          {isGrid ? (
            <Card className="overflow-hidden transition-all duration-200 border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 p-3 flex flex-col h-full">
              {showCheckbox && (
                <div
                  className="absolute z-20 top-2.5 left-2.5 stop-card-click"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(document.id)}
                    className="bg-background/90 backdrop-blur-md shadow-sm"
                  />
                </div>
              )}

              <div className="absolute top-1.5 right-1.5 z-20">{menu}</div>

              {/* Entire preview area is clickable (opens document) */}
              <div className="mb-2 relative w-full h-28 rounded-lg bg-gradient-to-br from-muted/40 via-muted/20 to-background border border-border/40 overflow-hidden flex items-center justify-center">
                <div className="relative w-20 h-[5.5rem] bg-background dark:bg-zinc-900 rounded-sm border border-border/60 shadow-xs p-1.5 flex flex-col justify-between group-hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-between pb-1 border-b border-border/40">
                    <DocTypeIcon docType={document.docType} className="w-3 h-3 text-primary" />
                    <span className="text-[8px] font-mono text-muted-foreground uppercase">
                      {document.mimeType.split('/')[1] || 'DOC'}
                    </span>
                  </div>
                  <div className="space-y-1 py-0.5">
                    <div className="h-1 bg-primary/20 rounded w-3/4" />
                    <div className="h-1 bg-muted-foreground/15 rounded w-full" />
                    <div className="h-1 bg-muted-foreground/15 rounded w-5/6" />
                  </div>
                  <div className="flex justify-between items-center text-[7.5px] text-muted-foreground pt-0.5 border-t border-border/30 font-mono">
                    <span>E2EE</span>
                    {document.maxPrivacy && (
                      <span className="text-emerald-500 font-semibold">MAX</span>
                    )}
                  </div>
                </div>
              </div>

              <h3
                className="font-semibold text-xs sm:text-sm truncate hover:text-primary transition-colors pr-1"
                title={document.title}
              >
                {document.title}
              </h3>
              <div className="mt-1.5 mb-2">{meta}</div>

              <div
                className="stop-card-click mt-auto pt-2 border-t border-border/40 grid grid-cols-3 gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 text-[11px] h-7 px-1 rounded-md bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPreview();
                  }}
                >
                  <RiEyeLine className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 text-[11px] h-7 px-1 rounded-md bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBucketDialog(true);
                  }}
                >
                  <RiFolderAddLine className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bucket</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 text-[11px] h-7 px-1 rounded-md bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                >
                  <RiShoppingCartLine className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cart</span>
                </Button>
              </div>
            </Card>
          ) : (
            /* Compact list row — whole row opens preview; actions stay icon-sized */
            <Card className="overflow-hidden transition-all duration-200 border-border/60 hover:border-primary/40 hover:bg-muted/20 px-3 py-2.5 flex items-center gap-3">
              {showCheckbox && (
                <div className="stop-card-click shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(document.id)}
                    className="bg-background shadow-sm"
                  />
                </div>
              )}

              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-muted/50 to-background border border-border/40 flex items-center justify-center">
                <DocTypeIcon docType={document.docType} className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate" title={document.title}>
                  {document.title}
                </h3>
                <div className="mt-1">{meta}</div>
              </div>

              {quickActions}
            </Card>
          )}
        </div>
      </motion.div>

      <MoveDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        type="document"
        itemId={document.id}
        itemName={document.title}
        currentFolderId={(document as any).folderId || null}
      />

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{document.title}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDoc.isPending}>
              {deleteDoc.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddToBucketDialog
        open={showBucketDialog}
        onOpenChange={setShowBucketDialog}
        documentId={document.id}
        documentTitle={document.title}
      />

      <EditDocumentDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        document={document}
      />
    </>
  );
}
