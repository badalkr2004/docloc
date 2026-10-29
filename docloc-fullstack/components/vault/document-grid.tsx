'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentCard } from './document-card';
import { FolderCard } from './folder-card';
import { EmptyState } from '@/components/common/empty-state';
import type { Document, FolderWithCount } from '@/lib/api/schemas';
import { RiFileList3Line } from '@remixicon/react';

interface DocumentGridProps {
  documents: Document[];
  folders?: FolderWithCount[];
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  onPreview: (doc: Document) => void;
  onFolderNavigate?: (folderId: string) => void;
  onDropDocToFolder?: (folderId: string, documentId: string) => void;
  onDropFolderToFolder?: (targetFolderId: string, draggedFolderId: string) => void;
}

export function DocumentGrid({
  documents,
  folders = [],
  isLoading,
  viewMode,
  onPreview,
  onFolderNavigate,
  onDropDocToFolder,
  onDropFolderToFolder,
}: DocumentGridProps) {
  if (isLoading) {
    return (
      <div className={viewMode === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        : "flex flex-col gap-3"
      }>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={viewMode === 'grid' ? "h-48 w-full rounded-xl" : "h-20 w-full rounded-xl"} />
        ))}
      </div>
    );
  }

  if (folders.length === 0 && documents.length === 0) {
    return (
      <EmptyState
        icon={RiFileList3Line}
        title="No documents found"
        description="Try adjusting your filters or upload some new documents to your vault."
        action={
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => document.dispatchEvent(new CustomEvent('open-upload-dialog'))}
          >
            Upload documents
          </button>
        }
      />
    );
  }

  return (
    <motion.div
      layout
      className={viewMode === 'grid'
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        : "flex flex-col gap-3"
      }
    >
      <AnimatePresence mode="popLayout">
        {/* Folders first */}
        {folders.map((folder) => (
          <FolderCard
            key={`folder-${folder.id}`}
            folder={folder}
            viewMode={viewMode}
            onNavigate={onFolderNavigate || (() => {})}
            onDrop={onDropDocToFolder}
            onDropFolder={onDropFolderToFolder}
          />
        ))}
        {/* Then documents */}
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            viewMode={viewMode}
            onPreview={onPreview}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
