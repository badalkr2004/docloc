'use client';

import { useState } from 'react';
import { useDocuments } from '@/lib/api/hooks/use-documents';
import { useFolders, useFolderBreadcrumbs } from '@/lib/api/hooks/use-folders';
import { useAddDocToBucket } from '@/lib/api/hooks/use-buckets';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RiSearchLine,
  RiAddLine,
  RiCheckLine,
  RiInboxArchiveLine,
  RiFolderLine,
  RiArrowLeftSLine,
  RiHome4Line
} from '@remixicon/react';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { DocTypeBadge } from '@/components/common/doc-type-badge';
import { toast } from 'sonner';

interface VaultPickerProps {
  bucketId: string;
  existingDocIds: Set<string>;
}

export function VaultPicker({ bucketId, existingDocIds }: VaultPickerProps) {
  const [search, setSearch] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // If user enters a search query, search globally across all folders ('all')
  // Otherwise, list documents at the current folder level
  const activeFolderId = search.trim() ? 'all' : (currentFolderId || null);

  const { data: documentsData, isLoading: docsLoading } = useDocuments({
    page: 1,
    query: search,
    folderId: activeFolderId,
    limit: 50,
  });
  const documents = documentsData?.documents || [];

  // Fetch folders at current level (only when not searching)
  const { data: folders = [], isLoading: foldersLoading } = useFolders(search.trim() ? undefined : (currentFolderId || null));
  const { data: breadcrumbs = [] } = useFolderBreadcrumbs(currentFolderId);

  const isLoading = docsLoading || (search.trim() ? false : foldersLoading);

  const { mutate: addDoc, isPending: isAdding } = useAddDocToBucket();

  const handleAdd = (docId: string) => {
    addDoc(
      { bucketId, documentId: docId },
      {
        onSuccess: () => {
          toast.success('Document added to bucket');
        },
        onError: () => {
          toast.error('Failed to add document');
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Vault Documents</h3>
          {currentFolderId && !search.trim() && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => {
                const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null;
                setCurrentFolderId(parent);
              }}
            >
              <RiArrowLeftSLine className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
        </div>

        {/* Breadcrumb Trail inside Picker */}
        {currentFolderId && !search.trim() && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto pb-1">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="flex items-center hover:text-primary transition-colors shrink-0"
            >
              <RiHome4Line className="w-3.5 h-3.5 mr-1" />
              Vault
            </button>
            {breadcrumbs.map((b) => (
              <span key={b.id} className="flex items-center gap-1 shrink-0">
                <span>/</span>
                <button
                  onClick={() => setCurrentFolderId(b.id)}
                  className={`hover:text-primary transition-colors truncate max-w-[100px] ${
                    b.id === currentFolderId ? 'font-semibold text-foreground' : ''
                  }`}
                >
                  {b.name}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search all documents..." 
            className="pl-9 bg-secondary/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
              <Skeleton className="w-10 h-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : !search.trim() && folders.length === 0 && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm text-center">
            <RiInboxArchiveLine className="w-8 h-8 mb-2 opacity-50" />
            <p>No documents or folders here</p>
          </div>
        ) : search.trim() && documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm text-center">
            <RiSearchLine className="w-8 h-8 mb-2 opacity-50" />
            <p>No matching documents found</p>
          </div>
        ) : (
          <>
            {/* Render Folders if not searching */}
            {!search.trim() && folders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                onClick={() => setCurrentFolderId(folder.id)}
                className="flex items-center gap-3 p-2 rounded-lg border bg-secondary/20 hover:bg-secondary/50 cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <RiFolderLine className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate" title={folder.name}>
                    {folder.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {folder.documentCount || 0} docs
                  </p>
                </div>
              </div>
            ))}

            {/* Render Documents */}
            {documents.map((doc) => {
              const isAdded = existingDocIds.has(doc.id);
              return (
                <div 
                  key={doc.id}
                  className="flex items-center gap-3 p-2 rounded-lg border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                    <DocTypeIcon docType={doc.docType} className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" title={doc.title}>
                      {doc.title}
                    </h4>
                    <div className="mt-0.5">
                      <DocTypeBadge docType={doc.docType} />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    className="h-8 w-8 sm:w-auto sm:px-3 shrink-0"
                    disabled={isAdded || isAdding}
                    onClick={() => handleAdd(doc.id)}
                  >
                    {isAdded ? (
                      <>
                        <RiCheckLine className="w-4 h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Added</span>
                      </>
                    ) : (
                      <>
                        <RiAddLine className="w-4 h-4 sm:mr-1.5" />
                        <span className="hidden sm:inline">Add</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
