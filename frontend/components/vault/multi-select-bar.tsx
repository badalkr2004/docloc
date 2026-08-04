'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useSelectionStore } from '@/stores/selection-store';
import { RiCloseLine, RiFolderAddLine, RiShoppingCartLine, RiDeleteBinLine } from '@remixicon/react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useBuckets, useAddDocToBucket } from '@/lib/api/hooks/use-buckets';
import { useAddDocToCart } from '@/lib/api/hooks/use-carts';
import { toast } from 'sonner';
import { useDeleteDocument } from '@/lib/api/hooks/use-documents';

export function MultiSelectBar() {
  const { selectedIds, clear, isSelecting, stopSelecting } = useSelectionStore();
  const { data: buckets } = useBuckets();
  const addToBucket = useAddDocToBucket();
  const addToCart = useAddDocToCart();
  const deleteDoc = useDeleteDocument();

  const count = selectedIds.size;
  const show = count > 0 || isSelecting;

  const handleClose = () => {
    clear();
    stopSelecting();
  };

  const handleAddToBucket = async (bucketId: string) => {
    try {
      const promises = Array.from(selectedIds).map(docId => 
        addToBucket.mutateAsync({ bucketId, documentId: docId })
      );
      await Promise.all(promises);
      toast.success(`Added ${count} documents to bucket`);
      clear();
    } catch (error) {
      toast.error('Failed to add documents to bucket');
    }
  };

  const handleAddToCart = async () => {
    try {
      const promises = Array.from(selectedIds).map(docId => 
        addToCart.mutateAsync({ documentId: docId })
      );
      await Promise.all(promises);
      toast.success(`Added ${count} document(s) to cart`);
      clear();
    } catch (error) {
      toast.error('Failed to add documents to cart');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${count} documents?`)) return;
    try {
      const promises = Array.from(selectedIds).map(docId => 
        deleteDoc.mutateAsync(docId)
      );
      await Promise.all(promises);
      toast.success(`Deleted ${count} documents`);
      clear();
    } catch (error) {
      toast.error('Failed to delete documents');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border shadow-xl rounded-full px-4 py-2 flex items-center gap-4"
        >
          <div className="flex items-center gap-2 px-2 border-r">
            <span className="bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
              {count}
            </span>
            <span className="text-sm font-medium mr-2">selected</span>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="sm" className="h-8 gap-2" disabled={count === 0}>
                  <RiFolderAddLine className="w-4 h-4" />
                  <span className="hidden sm:inline">Add to Bucket</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {buckets?.length ? (
                  buckets.map(bucket => (
                    <DropdownMenuItem key={bucket.id} onClick={() => handleAddToBucket(bucket.id)}>
                      {bucket.name}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No buckets found</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" className="h-8 gap-2" disabled={count === 0} onClick={handleAddToCart}>
              <RiShoppingCartLine className="w-4 h-4" />
              <span className="hidden sm:inline">Add to Cart</span>
            </Button>

            <Button variant="ghost" size="sm" className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={count === 0} onClick={handleDelete}>
              <RiDeleteBinLine className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full ml-2" onClick={handleClose}>
            <RiCloseLine className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
