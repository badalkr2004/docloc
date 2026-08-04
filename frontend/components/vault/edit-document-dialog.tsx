'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { RiCalendarLine, RiPriceTag3Line, RiText } from '@remixicon/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocTypeIcon } from '@/components/common/doc-type-icon';
import { StatusBadge } from '@/components/common/status-badge';
import { useUpdateDocument } from '@/lib/api/hooks/use-documents';
import { docTypeValues, type Document, type DocType } from '@/lib/api/schemas';

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
}

const CATEGORY_LABELS: Record<DocType, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  marksheet: 'Marksheet',
  certificate: 'Certificate',
  income_proof: 'Income Proof',
  photo: 'Photo',
  other: 'Other',
};

export function EditDocumentDialog({ open, onOpenChange, document }: EditDocumentDialogProps) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocType>('other');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const updateDocument = useUpdateDocument(document?.id);

  useEffect(() => {
    if (document && open) {
      setTitle(document.title);
      setDocType(document.docType);
      setIssueDate(document.issueDate ? document.issueDate.split('T')[0] : '');
      setExpiryDate(document.expiryDate ? document.expiryDate.split('T')[0] : '');
    }
  }, [document, open]);

  if (!document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Document name cannot be empty');
      return;
    }

    try {
      await updateDocument.mutateAsync({
        id: document.id,
        data: {
          title: title.trim(),
          docType,
          issueDate: issueDate ? new Date(issueDate).toISOString() : null,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        },
      });

      toast.success('Document updated successfully');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update document');
    }
  };

  // Preview date for live status badge
  const previewExpiry = expiryDate ? new Date(expiryDate).toISOString() : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>Edit Document Details</DialogTitle>
          <DialogDescription>
            Update category, name, and validity dates for &quot;{document.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title / Name */}
          <div className="space-y-2">
            <Label htmlFor="doc-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <RiText className="w-4 h-4 text-primary" />
              Document Name
            </Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Passport 2026"
              required
            />
          </div>

          {/* Category Grid */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <RiPriceTag3Line className="w-4 h-4 text-primary" />
              Category / Type
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {docTypeValues.map((type) => {
                const isSelected = docType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground font-medium ring-1 ring-primary'
                        : 'border-border/60 bg-card hover:bg-secondary/40 text-muted-foreground'
                    }`}
                  >
                    <DocTypeIcon docType={type} className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : ''}`} />
                    <span className="truncate">{CATEGORY_LABELS[type]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validity & Status (Expiry Date) */}
          <div className="space-y-3 p-4 rounded-xl border bg-secondary/10">
            <div className="flex items-center justify-between">
              <Label htmlFor="doc-expiry" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <RiCalendarLine className="w-4 h-4 text-primary" />
                Expiry Date (Status)
              </Label>
              <StatusBadge expiryDate={previewExpiry} />
            </div>

            <div className="flex gap-2">
              <Input
                id="doc-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="bg-background"
              />
              {expiryDate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExpiryDate('')}
                  className="text-xs shrink-0"
                >
                  Clear (Set Active)
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Documents without an expiry date are marked as <strong>Active</strong>. Adding an expiry date calculates <strong>Valid</strong>, <strong>Expiring Soon</strong>, or <strong>Expired</strong> status.
            </p>
          </div>

          {/* Issue Date */}
          <div className="space-y-2">
            <Label htmlFor="doc-issue" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <RiCalendarLine className="w-4 h-4 text-muted-foreground" />
              Issue Date (Optional)
            </Label>
            <Input
              id="doc-issue"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateDocument.isPending}
            >
              {updateDocument.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
