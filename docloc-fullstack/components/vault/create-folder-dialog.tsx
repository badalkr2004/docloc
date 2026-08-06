'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateFolder } from '@/lib/api/hooks/use-folders';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
}

const COLORS = [
  { name: 'default', class: 'bg-gray-200 dark:bg-gray-700' },
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'pink', class: 'bg-pink-500' },
];

export function CreateFolderDialog({ open, onOpenChange, parentId = null }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('default');
  
  const createFolder = useCreateFolder();

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    try {
      await createFolder.mutateAsync({ 
        name: name.trim(), 
        parentId: parentId || undefined, 
        color: color === 'default' ? undefined : color 
      });
      toast.success('Folder created successfully');
      setName('');
      setColor('default');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>Organize your documents by creating a folder</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Folder name</label>
            <Input 
              placeholder="Folder name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim() && !createFolder.isPending) {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Color (optional)</label>
            <div className="flex items-center gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColor(c.name)}
                  className={`w-6 h-6 rounded-full transition-all ${c.class} ${
                    color === c.name ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background' : 'hover:scale-110'
                  }`}
                  aria-label={`Select ${c.name} color`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createFolder.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || createFolder.isPending}
          >
            {createFolder.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
