import { create } from 'zustand';

export type UploadStatus = 'pending' | 'encrypting' | 'creating' | 'uploading' | 'ocr' | 'done' | 'error';

export interface UploadItem {
  id: string; // client-generated unique id
  file: File;
  title: string;
  docType: string;
  maxPrivacy: boolean;
  status: UploadStatus;
  progress: number; // 0-100 for upload step
  error?: string;
  documentId?: string; // set after POST /api/documents
}

interface UploadState {
  items: UploadItem[];
  addFiles: (files: File[]) => void;
  updateItem: (id: string, partial: Partial<UploadItem>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  items: [],
  addFiles: (files) =>
    set((state) => ({
      items: [
        ...state.items,
        ...files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          title: file.name,
          docType: 'other',
          maxPrivacy: true,
          status: 'pending' as UploadStatus,
          progress: 0,
        })),
      ],
    })),
  updateItem: (id, partial) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...partial } : item
      ),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      items: state.items.filter((item) => item.status !== 'done'),
    })),
}));
