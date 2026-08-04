'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useUploadStore } from '@/stores/upload-store';
import { Progress } from '@/components/ui/progress';
import { RiUploadCloud2Line } from '@remixicon/react';

export function UploadProgress() {
  const { items } = useUploadStore();
  
  const activeItems = items.filter(i => 
    i.status !== 'pending' && i.status !== 'done' && i.status !== 'error'
  );
  
  const showWidget = activeItems.length > 0;
  
  const totalProgress = activeItems.length > 0
    ? activeItems.reduce((acc, item) => acc + item.progress, 0) / activeItems.length
    : 0;

  return (
    <AnimatePresence>
      {showWidget && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 w-72 bg-card border rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            // Can be tied to a store state to open the upload dialog
            // e.g., useUiStore().setUploadDialogOpen(true)
            document.dispatchEvent(new CustomEvent('open-upload-dialog'));
          }}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <RiUploadCloud2Line className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Uploading {activeItems.length} files...</p>
              <Progress value={totalProgress} className="h-1.5" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
