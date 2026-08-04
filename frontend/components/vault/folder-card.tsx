'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RiFolderLine,
  RiFolderOpenLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFolderTransferLine,
  RiPaletteLine
} from '@remixicon/react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateFolder, useDeleteFolder } from '@/lib/api/hooks/use-folders';
import { MoveDialog } from './move-dialog';

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    color: string | null;
    parentId?: string | null;
    documentCount?: number;
    childFolderCount?: number;
  };
  onNavigate: (folderId: string) => void;
  onDrop?: (folderId: string, documentId: string) => void;
  onDropFolder?: (targetFolderId: string, draggedFolderId: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  red: 'text-red-500 bg-red-500/10 border-red-500/20',
  green: 'text-green-500 bg-green-500/10 border-green-500/20',
  purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  pink: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  default: 'text-primary bg-primary/5 border-primary/10'
};

export function FolderCard({ folder, onNavigate, onDrop, onDropFolder }: FolderCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const colorClass = folder.color && COLOR_MAP[folder.color] ? COLOR_MAP[folder.color] : COLOR_MAP.default;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 1. Check if a folder was dragged
    const draggedFolderId = e.dataTransfer.getData('application/x-docloc-folder') || e.dataTransfer.getData('folderId');
    if (draggedFolderId) {
      if (draggedFolderId === folder.id) return; // Cannot drop onto itself
      if (onDropFolder) {
        onDropFolder(folder.id, draggedFolderId);
      }
      return;
    }

    // 2. Check if a document was dragged
    const documentId = e.dataTransfer.getData('application/x-docloc-document') || e.dataTransfer.getData('documentId') || e.dataTransfer.getData('text/plain');
    if (documentId && onDrop) {
      onDrop(folder.id, documentId);
    }
  };

  const handleRename = async () => {
    if (editName.trim() === '' || editName === folder.name) {
      setIsEditing(false);
      setEditName(folder.name);
      return;
    }

    try {
      await updateFolder.mutateAsync({ id: folder.id, data: { name: editName } });
      setIsEditing(false);
      toast.success('Folder renamed');
    } catch (error) {
      toast.error('Failed to rename folder');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this folder?')) {
      try {
        await deleteFolder.mutateAsync(folder.id);
        toast.success('Folder deleted');
      } catch (error) {
        toast.error('Failed to delete folder');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(folder.name);
    }
  };

  return (
    <>
      <motion.div
        layout
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <div
          className="h-full"
          draggable
          onDragStart={(e: React.DragEvent) => {
            e.dataTransfer.setData('application/x-docloc-folder', folder.id);
            e.dataTransfer.setData('folderId', folder.id);
            e.dataTransfer.setData('text/plain', folder.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <Card 
            className={`group h-full flex flex-col border-border/60 hover:border-primary/40 transition-colors cursor-pointer overflow-hidden ${
              isDragOver ? 'ring-2 ring-primary/50 scale-[1.02]' : ''
            }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isEditing && onNavigate(folder.id)}
          >
            <div className={`h-36 flex items-center justify-center border-b ${colorClass} transition-colors relative`}>
              {isHovered ? (
                <RiFolderOpenLine className="w-16 h-16 opacity-80" />
              ) : (
                <RiFolderLine className="w-16 h-16 opacity-80" />
              )}
              
              <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity"><RiMoreLine className="w-4 h-4" /></Button>} />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <RiEditLine className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                      <RiFolderTransferLine className="w-4 h-4 mr-2" />
                      Move Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                      <RiDeleteBinLine className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="p-4 flex flex-col gap-1 flex-1">
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={handleKeyDown}
                  className="h-7 px-2 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="font-semibold text-sm truncate" title={folder.name}>
                  {folder.name}
                </h3>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-2">
                <span>{folder.documentCount || 0} docs</span>
                {folder.childFolderCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{folder.childFolderCount} folders</span>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      <MoveDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        type="folder"
        itemId={folder.id}
        itemName={folder.name}
        currentFolderId={folder.parentId || null}
      />
    </>
  );
}
