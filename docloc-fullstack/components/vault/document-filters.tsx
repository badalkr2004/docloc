'use client';

import { useState, useEffect } from 'react';
import { RiSearchLine, RiGridLine, RiListCheck, RiCheckboxMultipleLine } from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui-store';
import { useSelectionStore } from '@/stores/selection-store';
import { docTypeValues, type DocumentFilters as FilterType } from '@/lib/api/schemas';

const DOC_TYPES = docTypeValues;

interface DocumentFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function DocumentFilters({ filters, onFiltersChange }: DocumentFiltersProps) {
  const { viewMode, setViewMode } = useUiStore();
  const { isSelecting, startSelecting, stopSelecting } = useSelectionStore();
  const [localQuery, setLocalQuery] = useState(filters.query || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== (filters.query || '')) {
        onFiltersChange({ ...filters, query: localQuery, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, filters, onFiltersChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center w-full mb-6">
      <div className="flex flex-1 gap-2 sm:gap-4 w-full items-center">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search documents..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.docType || 'all'}
          onValueChange={(val) => onFiltersChange({ ...filters, docType: (!val || val === 'all') ? undefined : val as any, page: 1 })}
        >
          <SelectTrigger className="w-[120px] sm:w-[140px] capitalize">
            <SelectValue placeholder="Doc Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <Button
          variant={isSelecting ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => (isSelecting ? stopSelecting() : startSelecting())}
        >
          <RiCheckboxMultipleLine className="w-4 h-4" />
          <span className="hidden sm:inline">{isSelecting ? 'Cancel' : 'Select'}</span>
        </Button>
        <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <RiGridLine className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <RiListCheck className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
