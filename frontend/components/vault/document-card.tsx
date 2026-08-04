'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { RiEyeLine, RiFolderAddLine, RiShoppingCartLine, RiDeleteBinLine, RiMoreLine, RiFolderTransferLine, RiEditLine } from '@remixicon/react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
            // Trigger preview when clicking the card background
            if (!(e.target as HTMLElement).closest('.stop-card-click')) {
              onPreview?.(document);
            }
          }}
        >
        <Card className={`overflow-hidden transition-all duration-200 border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${isGrid ? 'p-4 flex flex-col h-full' : 'p-3 flex items-center gap-4'}`}>
          
          {(isSelecting || isSelected) && (
            <div className={`absolute z-20 stop-card-click ${isGrid ? 'top-3 left-3' : 'left-3 top-1/2 -translate-y-1/2'}`}>
              <Checkbox 
                checked={isSelected}
                onCheckedChange={() => toggle(document.id)}
                className="bg-background/90 backdrop-blur-md shadow-sm"
              />
            </div>
          )}

          {/* Thumbnail / Mini Preview Area */}
          <div className={`stop-card-click ${isGrid ? 'mb-4 relative w-full h-36 rounded-lg bg-gradient-to-br from-muted/40 via-muted/20 to-background border border-border/40 overflow-hidden flex items-center justify-center' : 'flex-shrink-0 w-14 h-14 relative rounded-md bg-gradient-to-br from-muted/40 to-background border border-border/40 flex items-center justify-center ml-6'}`}>
            
            {/* Mini Paper Preview Mockup */}
            {isGrid ? (
              <div className="relative w-24 h-28 bg-background dark:bg-zinc-900 rounded-sm border border-border/60 shadow-sm p-2 flex flex-col justify-between group-hover:scale-105 transition-transform duration-300">
                {/* Header bar accent */}
                <div className="flex items-center justify-between pb-1 border-b border-border/40">
                  <DocTypeIcon docType={document.docType} className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] font-mono text-muted-foreground uppercase">{document.mimeType.split('/')[1] || 'DOC'}</span>
                </div>
                {/* Mock text lines */}
                <div className="space-y-1.5 py-1">
                  <div className="h-1 bg-primary/20 rounded w-3/4" />
                  <div className="h-1 bg-muted-foreground/15 rounded w-full" />
                  <div className="h-1 bg-muted-foreground/15 rounded w-5/6" />
                  <div className="h-1 bg-muted-foreground/10 rounded w-2/3" />
                </div>
                {/* Footer badge */}
                <div className="flex justify-between items-center text-[8px] text-muted-foreground pt-1 border-t border-border/30 font-mono">
                  <span>E2EE</span>
                  {document.maxPrivacy && <span className="text-emerald-500 font-semibold">🔒 MAX</span>}
                </div>
              </div>
            ) : (
              <DocTypeIcon docType={document.docType} className="w-6 h-6 text-primary" />
            )}
            
            {/* Quick Actions Hover Overlay */}
            <div 
              className="stop-card-click absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 rounded-lg z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 rounded-full shadow-sm hover:scale-105 transition-transform" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview?.(document);
                      }}
                    >
                      <RiEyeLine className="w-4 h-4 text-primary" />
                    </Button>
                  } />
                  <TooltipContent>Preview</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger render={
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 rounded-full shadow-sm hover:scale-105 transition-transform" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBucketDialog(true);
                      }}
                    >
                      <RiFolderAddLine className="w-4 h-4" />
                    </Button>
                  } />
                  <TooltipContent>Add to Bucket</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger render={
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 rounded-full shadow-sm hover:scale-105 transition-transform" 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await addToCart.mutateAsync({ documentId: document.id });
                          toast.success(`Added "${document.title}" to cart`);
                        } catch (err: any) {
                          toast.error('Failed to add to cart');
                        }
                      }}
                    >
                      <RiShoppingCartLine className="w-4 h-4 text-primary" />
                    </Button>
                  } />
                  <TooltipContent>Add to Cart</TooltipContent>
                </Tooltip>

                <div className="stop-card-click" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 rounded-full shadow-sm hover:scale-105 transition-transform"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RiMoreLine className="w-4 h-4" />
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
              </TooltipProvider>
            </div>
          </div>

          <div className={`flex flex-col ${isGrid ? 'flex-1' : 'flex-1 min-w-0'}`}>
            <div className="flex items-start justify-between mb-2">
              {isEditing ? (
                <div className="stop-card-click w-full">
                  <Input
                    autoFocus
                    value={titleEdit}
                    onChange={(e) => setTitleEdit(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    className="h-7 text-sm px-2 -ml-2"
                  />
                </div>
              ) : (
                <h3 
                  className="font-medium text-sm truncate hover:text-primary transition-colors"
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

            <div className={`flex items-center gap-2 ${isGrid ? 'flex-wrap mt-auto' : 'flex-nowrap shrink-0 ml-auto'}`}>
              <DocTypeBadge docType={document.docType} />
              <StatusBadge expiryDate={document.expiryDate} />
              <div className="text-xs text-muted-foreground flex gap-2 ml-auto">
                <span>{formatFileSize(document.fileSizeBytes)}</span>
                {isGrid && <span>•</span>}
                <span>{formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
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
