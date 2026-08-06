'use client';

import { useCart, useRemoveDocFromCart } from '@/lib/api/hooks/use-carts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RiDeleteBinLine, RiFileTextLine, RiImageLine, RiFilePdfLine } from '@remixicon/react';
import Link from 'next/link';

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function CartContents({ cartId }: { cartId: string }) {
  const { data: cart, isLoading } = useCart(cartId);
  const removeDoc = useRemoveDocFromCart();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (!cart || !cart.documents || cart.documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
        <RiFileTextLine className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Cart is empty</h3>
        <p className="text-sm text-muted-foreground mb-4">Add documents to your cart to share them.</p>
        <Link href="/vault">
          <Button variant="outline">Browse Vault</Button>
        </Link>
      </div>
    );
  }

  const totalSize = cart.documents.reduce((acc, doc) => acc + doc.fileSizeBytes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Cart Documents</h3>
        <div className="text-sm text-muted-foreground">
          {cart.documents.length} files • {formatFileSize(totalSize)}
        </div>
      </div>
      <div className="space-y-3">
        {cart.documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md bg-card">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-primary/10 rounded-md shrink-0">
                {doc.mimeType?.startsWith('image/') ? (
                  <RiImageLine className="h-5 w-5 text-primary" />
                ) : doc.mimeType === 'application/pdf' ? (
                  <RiFilePdfLine className="h-5 w-5 text-primary" />
                ) : (
                  <RiFileTextLine className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded-sm">
                    {doc.docType || doc.mimeType?.split('/')[1] || 'FILE'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0 pl-4">
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {formatFileSize(doc.fileSizeBytes)}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive"
                onClick={() => removeDoc.mutate({ cartId, documentId: doc.id })}
                disabled={removeDoc.isPending}
              >
                <RiDeleteBinLine className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Link href="/vault" className="w-full">
        <Button variant="outline" className="w-full">Add more documents</Button>
      </Link>
    </div>
  );
}
