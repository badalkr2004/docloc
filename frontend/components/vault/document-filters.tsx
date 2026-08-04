'use client';

import { useState, useEffect } from 'react';
import { RiSearchLine, RiGridLine, RiListCheck } from '@remixicon/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/stores/ui-store';
import { docTypeValues, type DocumentFilters as FilterType } from '@/lib/api/schemas';

const DOC_TYPES = docTypeValues;

interface DocumentFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function DocumentFilters({ filters, onFiltersChange }: DocumentFiltersProps) {
  const { viewMode, setViewMode } = useUiStore();
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
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center w-full mb-6">
      <div className="flex flex-1 gap-4 w-full sm:w-auto items-center">
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
          <SelectTrigger className="w-[140px] capitalize">
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

      <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode('grid')}
        >
          <RiGridLine className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => setViewMode('list')}
        >
          <RiListCheck className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
