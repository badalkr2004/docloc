'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { RiFolderLine, RiArrowRightSLine, RiArrowDownSLine } from '@remixicon/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFolders, useMoveDocument, useMoveFolder } from '@/lib/api/hooks/use-folders';

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'document' | 'folder';
  itemId: string;
  itemName: string;
  currentFolderId?: string | null;
}

interface FolderTreeItemProps {
  folder: any;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  level?: number;
  disabledId?: string;
}

function FolderTreeItem({ folder, selectedId, onSelect, level = 0, disabledId }: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: children = [] } = useFolders(folder.id);
  
  const isSelected = selectedId === folder.id;
  const isDisabled = disabledId === folder.id;
  
  return (
    <div className="w-full">
      <div 
        className={`flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
        } ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => !isDisabled && onSelect(folder.id)}
      >
        <button 
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {folder.childFolderCount !== 0 ? (
            isExpanded ? <RiArrowDownSLine className="w-4 h-4" /> : <RiArrowRightSLine className="w-4 h-4" />
          ) : <div className="w-4 h-4" />}
        </button>
        <RiFolderLine className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm truncate">{folder.name}</span>
      </div>
      
      {isExpanded && children.length > 0 && (
        <div className="flex flex-col w-full">
          {children.map((child: any) => (
            <FolderTreeItem 
              key={child.id} 
              folder={child} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              level={level + 1}
              disabledId={disabledId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MoveDialog({ open, onOpenChange, type, itemId, itemName, currentFolderId = null }: MoveDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  
  const { data: rootFolders = [] } = useFolders(null);
  
  const moveDocument = useMoveDocument();
  const moveFolder = useMoveFolder();
  
  const isPending = moveDocument.isPending || moveFolder.isPending;

  const handleMove = async () => {
    try {
      if (type === 'document') {
        await moveDocument.mutateAsync({ id: itemId, folderId: selectedFolderId });
      } else {
        await moveFolder.mutateAsync({ id: itemId, parentId: selectedFolderId });
      }
      toast.success(`${type === 'document' ? 'Document' : 'Folder'} moved successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to move item');
    }
  };

  React.useEffect(() => {
    if (open) {
      setSelectedFolderId(currentFolderId);
    }
  }, [open, currentFolderId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Move {itemName}</DialogTitle>
          <DialogDescription>Select a destination folder</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto border rounded-md p-2 space-y-1">
          <div 
            className={`flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
              selectedFolderId === null ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
            }`}
            onClick={() => setSelectedFolderId(null)}
          >
            <div className="w-5 h-5" />
            <RiFolderLine className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Vault (Root)</span>
          </div>
          
          {rootFolders.map((folder: any) => (
            <FolderTreeItem 
              key={folder.id} 
              folder={folder} 
              selectedId={selectedFolderId} 
              onSelect={setSelectedFolderId}
              disabledId={type === 'folder' ? itemId : undefined}
            />
          ))}
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isPending || selectedFolderId === currentFolderId}>
            {isPending ? 'Moving...' : 'Move Here'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
