'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RiAddLine, RiFolderAddLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { useDocuments } from '@/lib/api/hooks/use-documents';
import { useFolders, useMoveDocument, useMoveFolder } from '@/lib/api/hooks/use-folders';
import { useUiStore } from '@/stores/ui-store';
import { DocumentFilters } from '@/components/vault/document-filters';
import { DocumentGrid } from '@/components/vault/document-grid';
import { UploadDialog } from '@/components/vault/upload-dialog';
import { UploadProgress } from '@/components/vault/upload-progress';
import { MultiSelectBar } from '@/components/vault/multi-select-bar';
import { DocumentViewer } from '@/components/vault/document-viewer';
import { BreadcrumbNav } from '@/components/vault/breadcrumb-nav';
import { CreateFolderDialog } from '@/components/vault/create-folder-dialog';
import type { Document, DocumentFilters as FilterType, FolderWithCount } from '@/lib/api/schemas';
import { toast } from 'sonner';

export default function VaultPage() {
  const router = useRouter();
  const params = useParams();
  const { viewMode } = useUiStore();

  // Extract folderId from URL params (catch-all route)
  const folderId = params?.folderId
    ? Array.isArray(params.folderId) ? params.folderId[0] : params.folderId
    : null;

  const [filters, setFilters] = useState<FilterType>({ page: 1, limit: 50 });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Check if search query is active
  const isSearching = Boolean(filters.query?.trim());
  const searchQuery = (filters.query || '').trim().toLowerCase();

  // Fetch documents for current folder or across all folders when searching
  const { data: documentsData, isLoading: docsLoading } = useDocuments({
    ...filters,
    folderId: isSearching ? 'all' : (folderId || null),
  });
  const documents = documentsData?.documents || [];
  const total = documentsData?.total || 0;

  // Fetch folders at current level
  const { data: rawFolders, isLoading: foldersLoading } = useFolders(folderId || null);

  // Filter folders by search query if searching
  const folders = (rawFolders as FolderWithCount[] || []).filter((f) =>
    isSearching ? f.name.toLowerCase().includes(searchQuery) : true
  );

  // Move hooks for drag-and-drop
  const moveDocument = useMoveDocument();
  const moveFolder = useMoveFolder();

  const isLoading = docsLoading || foldersLoading;

  useEffect(() => {
    const handleOpenDialog = () => setUploadOpen(true);
    document.addEventListener('open-upload-dialog', handleOpenDialog);
    return () => document.removeEventListener('open-upload-dialog', handleOpenDialog);
  }, []);

  // Navigate into a folder
  const navigateToFolder = (targetFolderId: string | null) => {
    if (targetFolderId) {
      router.push(`/vault/${targetFolderId}`);
    } else {
      router.push('/vault');
    }
  };

  // Handle drag-and-drop of document into folder
  const handleDropDocToFolder = async (targetFolderId: string, documentId: string) => {
    try {
      await moveDocument.mutateAsync({ id: documentId, folderId: targetFolderId });
      toast.success('Document moved to folder');
    } catch {
      toast.error('Failed to move document');
    }
  };

  // Handle drag-and-drop of folder into another folder
  const handleDropFolderToFolder = async (targetFolderId: string, draggedFolderId: string) => {
    try {
      await moveFolder.mutateAsync({ id: draggedFolderId, parentId: targetFolderId });
      toast.success('Folder moved successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to move folder');
    }
  };

  return (
    <div className="container max-w-7xl mx-auto py-4 sm:py-8 px-4 sm:px-6 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Your Vault</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Securely manage and encrypt your private documents.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setCreateFolderOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <RiFolderAddLine className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button
            onClick={() => setUploadOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <RiAddLine className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <BreadcrumbNav folderId={folderId} onNavigate={navigateToFolder} />

      {/* Filters */}
      <DocumentFilters filters={filters} onFiltersChange={setFilters} />

      {/* Content Grid */}
      <div className="flex-1">
        <DocumentGrid
          documents={documents}
          folders={(folders as FolderWithCount[]) || []}
          isLoading={isLoading}
          viewMode={viewMode}
          onPreview={setPreviewDoc}
          onFolderNavigate={navigateToFolder}
          onDropDocToFolder={handleDropDocToFolder}
          onDropFolderToFolder={handleDropFolderToFolder}
        />
      </div>

      {/* Pagination */}
      {total > (filters.limit || 50) && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={(filters.page || 1) <= 1}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={(filters.page || 1) * (filters.limit || 50) >= total}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Dialogs & Overlays */}
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} folderId={folderId} />
      <UploadProgress />
      <MultiSelectBar />
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        parentId={folderId}
      />
      <DocumentViewer
        document={previewDoc}
        documents={documents}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        onNavigate={setPreviewDoc}
      />
    </div>
  );
}
