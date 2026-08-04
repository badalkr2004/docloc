'use client';

import { useCarts, useCart, useCreateCart } from '@/lib/api/hooks/use-carts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartContents } from '@/components/cart/cart-contents';
import { ShareWizard } from '@/components/cart/share-wizard';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { RiAddLine, RiShoppingCartLine } from '@remixicon/react';
import { toast } from 'sonner';

export default function CartPage() {
  const { data: carts, isLoading } = useCarts();
  const createCart = useCreateCart();
  const [newCartLabel, setNewCartLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const draftCartSummary = carts?.find(c => c.status === 'draft');
  const { data: draftCart } = useCart(draftCartSummary?.id || '');

  const handleCreateCart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await createCart.mutateAsync({ label: newCartLabel || 'New Share Cart' });
      setNewCartLabel('');
      toast.success('New cart created');
    } catch (error) {
      toast.error('Failed to create cart');
    } finally {
      setIsCreating(false);
    }
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

  if (!draftCartSummary) {
    return (
      <div className="p-6 max-w-3xl mx-auto mt-12">
        <div className="text-center space-y-6 bg-card p-12 rounded-xl border shadow-sm">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <RiShoppingCartLine className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">No active cart</h2>
            <p className="text-muted-foreground">Create a new cart to start selecting documents for sharing.</p>
          </div>
          <form onSubmit={handleCreateCart} className="max-w-sm mx-auto flex items-center gap-2">
            <Input 
              placeholder="Cart Label (e.g. For Accountant)" 
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
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Share Cart</h1>
          <p className="text-muted-foreground">Prepare documents to securely share with others.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium bg-muted px-3 py-1 rounded-full">
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
          />
        </div>
      </div>
    </div>
  );
}

