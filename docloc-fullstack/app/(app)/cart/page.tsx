'use client';

import { useCarts, useCart, useCreateCart, cartKeys } from '@/lib/api/hooks/use-carts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartContents } from '@/components/cart/cart-contents';
import { ShareWizard } from '@/components/cart/share-wizard';
import { ShareLinkDisplay } from '@/components/cart/share-link-display';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { RiAddLine, RiShoppingCartLine, RiCheckLine } from '@remixicon/react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function CartPage() {
  const queryClient = useQueryClient();
  const { data: carts, isLoading } = useCarts();
  const createCart = useCreateCart();
  const [newCartLabel, setNewCartLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [completedShareUrl, setCompletedShareUrl] = useState<string | null>(null);

  const draftCartSummary = carts?.find((c) => c.status === 'draft');
  const { data: draftCart } = useCart(draftCartSummary?.id || '');

  const handleCreateCart = async (e?: React.FormEvent, label?: string) => {
    e?.preventDefault();
    try {
      setIsCreating(true);
      await createCart.mutateAsync({ label: label || newCartLabel || 'New Share Cart' });
      setNewCartLabel('');
      setCompletedShareUrl(null);
      toast.success('New cart created');
    } catch {
      toast.error('Failed to create cart');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareComplete = async (shareUrl: string) => {
    setCompletedShareUrl(shareUrl);
    // Cart is now "shared" on the server — refresh list so draft disappears cleanly
    await queryClient.invalidateQueries({ queryKey: cartKeys.lists() });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] rounded-lg" />
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      </div>
    );
  }

  // After a successful share, keep the link visible even though the cart is no longer draft
  if (completedShareUrl && !draftCartSummary) {
    return (
      <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <RiCheckLine className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Share link ready</h1>
          <p className="text-sm text-muted-foreground">
            Copy the full link (including the key). Anyone with it can open the documents.
          </p>
        </div>
        <ShareLinkDisplay shareUrl={completedShareUrl} />
        <Button
          className="w-full"
          onClick={() => handleCreateCart(undefined, 'New Share Cart')}
          disabled={isCreating}
        >
          <RiAddLine className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating…' : 'Start a new share cart'}
        </Button>
      </div>
    );
  }

  if (!draftCartSummary) {
    return (
      <div className="p-6 max-w-3xl mx-auto mt-12">
        <div className="text-center space-y-6 bg-card p-12 rounded-xl border shadow-sm">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <RiShoppingCartLine className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">No active cart</h2>
            <p className="text-muted-foreground">
              Create a cart, add documents from the vault, then generate a secure share link.
            </p>
          </div>
          <form onSubmit={handleCreateCart} className="max-w-sm mx-auto flex items-center gap-2">
            <Input
              placeholder="Cart label (e.g. For Accountant)"
              value={newCartLabel}
              onChange={(e) => setNewCartLabel(e.target.value)}
              disabled={isCreating}
            />
            <Button type="submit" disabled={isCreating}>
              <RiAddLine className="w-4 h-4 mr-2" />
              Create Cart
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 sm:space-y-1">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Share Cart</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Prepare documents to securely share with others.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full truncate max-w-[160px]">
            {draftCartSummary.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <CartContents cartId={draftCartSummary.id} />
        </div>

        <div className="sticky top-6">
          <ShareWizard
            cartId={draftCartSummary.id}
            documents={draftCart?.documents || []}
            onShareComplete={handleShareComplete}
          />
        </div>
      </div>
    </div>
  );
}
