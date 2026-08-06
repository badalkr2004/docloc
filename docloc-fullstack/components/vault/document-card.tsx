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
  RiEditLine 
} from '@remixicon/react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSelectionStore } from '@/stores/selection-store';
import { useUpdateDocument, useDeleteDocument } from '@/lib/api/hooks/use-documents';
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [titleEdit, setTitleEdit] = useState(document.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showBucketDialog, setShowBucketDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();
  const addToCart = useAddDocToCart();

  const handleTitleSave = () => {
    setIsEditing(false);
    if (titleEdit.trim() && titleEdit !== document.title) {
      updateDoc.mutate({ id: document.id, data: { title: titleEdit.trim() } });
    } else {
      setTitleEdit(document.title);
    }
  };

  const handleDelete = () => {
    deleteDoc.mutate(document.id, {
      onSuccess: () => {
        toast.success('Document deleted');
        setShowDeleteConfirm(false);
      }
    });
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addToCart.mutateAsync({ documentId: document.id });
      toast.success(`Added "${document.title}" to cart`);
    } catch (err: any) {
      toast.error('Failed to add to cart');
    }
  };

  const isGrid = viewMode === 'grid';

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -2 }}
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
            if (!(e.target as HTMLElement).closest('.stop-card-click')) {
              onPreview?.(document);
            }
          }}
        >
          <Card className={`overflow-hidden transition-all duration-200 border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${isGrid ? 'p-3 flex flex-col justify-between h-full' : 'p-2.5 flex items-center gap-3'}`}>
            
            {/* Selection Checkbox (Top Left) */}
            {(isSelecting || isSelected) && (
              <div className={`absolute z-20 stop-card-click ${isGrid ? 'top-2.5 left-2.5' : 'left-2.5 top-1/2 -translate-y-1/2'}`}>
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => toggle(document.id)}
                  className="bg-background/90 backdrop-blur-md shadow-sm"
                />
              </div>
            )}

            {/* Top Right Three-Dot Menu */}
            <div className={`stop-card-click z-20 ${isGrid ? 'absolute top-2 right-2' : 'ml-auto shrink-0'}`}>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full opacity-80 group-hover:opacity-100 hover:bg-muted transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RiMoreLine className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                } />
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}>
                    <RiEditLine className="w-4 h-4 mr-2" />
                    Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowBucketDialog(true); }}>
                    <RiFolderAddLine className="w-4 h-4 mr-2" />
                    Add to Bucket
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowMoveDialog(true); }}>
                    <RiFolderTransferLine className="w-4 h-4 mr-2" />
                    Move to Folder
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}>
                    <RiDeleteBinLine className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Main Content Area (Thumbnail + Metadata) */}
            <div className={`flex ${isGrid ? 'flex-col flex-1' : 'flex-1 items-center gap-3 min-w-0 pr-2'}`}>
              
              {/* Thumbnail / Paper Preview */}
              <div className={`stop-card-click ${isGrid ? 'mb-2 relative w-full h-28 rounded-lg bg-gradient-to-br from-muted/40 via-muted/20 to-background border border-border/40 overflow-hidden flex items-center justify-center' : 'flex-shrink-0 w-11 h-11 relative rounded-lg bg-gradient-to-br from-muted/40 to-background border border-border/40 flex items-center justify-center ml-5'}`}>
                {isGrid ? (
                  <div className="relative w-20 h-22 bg-background dark:bg-zinc-900 rounded-sm border border-border/60 shadow-xs p-1.5 flex flex-col justify-between group-hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between pb-1 border-b border-border/40">
                      <DocTypeIcon docType={document.docType} className="w-3 h-3 text-primary" />
                      <span className="text-[8px] font-mono text-muted-foreground uppercase">{document.mimeType.split('/')[1] || 'DOC'}</span>
                    </div>
                    <div className="space-y-1 py-0.5">
                      <div className="h-1 bg-primary/20 rounded w-3/4" />
                      <div className="h-1 bg-muted-foreground/15 rounded w-full" />
                      <div className="h-1 bg-muted-foreground/15 rounded w-5/6" />
                    </div>
                    <div className="flex justify-between items-center text-[7.5px] text-muted-foreground pt-0.5 border-t border-border/30 font-mono">
                      <span>E2EE</span>
                      {document.maxPrivacy && <span className="text-emerald-500 font-semibold">🔒 MAX</span>}
                    </div>
                  </div>
                ) : (
                  <DocTypeIcon docType={document.docType} className="w-5 h-5 text-primary" />
                )}
              </div>

              {/* Title & Metadata */}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  {isEditing ? (
                    <div className="stop-card-click w-full">
                      <Input
                        autoFocus
                        value={titleEdit}
                        onChange={(e) => setTitleEdit(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                        className="h-6 text-xs px-2 -ml-2"
                      />
                    </div>
                  ) : (
                    <h3 
                      className="font-semibold text-xs sm:text-sm truncate hover:text-primary transition-colors text-foreground pr-5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview?.(document);
                      }}
                      title={document.title}
                    >
                      {document.title}
                    </h3>
                  )}
                </div>

                <div className={`flex items-center gap-1.5 ${isGrid ? 'flex-wrap mt-auto' : 'flex-nowrap'}`}>
                  <DocTypeBadge docType={document.docType} />
                  <StatusBadge expiryDate={document.expiryDate} />
                  <div className="text-[10px] text-muted-foreground flex gap-1 ml-auto font-mono">
                    <span>{formatFileSize(document.fileSizeBytes)}</span>
                    {isGrid && <span>•</span>}
                    <span>{formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Native Action Bar (Preview = Sky Blue, Bucket = Amber, Cart = Emerald Green) */}
            <div className={`stop-card-click border-t border-border/40 ${isGrid ? 'pt-2 mt-2 grid grid-cols-3 gap-1.5' : 'pl-3 border-l border-t-0 border-border/40 flex items-center gap-1.5'}`}>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-1 text-[11px] h-7 px-1.5 rounded-none bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/30 hover:border-sky-500/60 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-all shadow-2xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview?.(document);
                }}
              >
                <RiEyeLine className="w-4 h-4 sm:w-3 sm:h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className={isGrid ? "hidden sm:inline" : ""}>Preview</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-1 text-[11px] h-7 px-1.5 rounded-none bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 hover:border-amber-500/60 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all shadow-2xs font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBucketDialog(true);
                }}
              >
                <RiFolderAddLine className="w-4 h-4 sm:w-3 sm:h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className={isGrid ? "hidden sm:inline" : ""}>Bucket</span>
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-1 text-[11px] h-7 px-1.5 rounded-none bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all shadow-2xs font-medium"
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
              >
                <RiShoppingCartLine className="w-4 h-4 sm:w-3 sm:h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className={isGrid ? "hidden sm:inline" : ""}>Cart</span>
              </Button>
            </div>

          </Card>
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
              Are you sure you want to delete "{document.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
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
