'use client';

import { useState } from 'react';
import { useAuditLogs } from '@/lib/api/hooks/use-audit';
import { format, formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RiArrowLeftSLine, RiArrowRightSLine, RiHistoryLine } from '@remixicon/react';

function ActionBadge({ action }: { action: string }) {
  const getColors = (action: string) => {
    switch (action) {
      case 'upload': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'view': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'download': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'share': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'revoke':
      case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'edit_metadata': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'ocr_process': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const label = action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold rounded-full ${getColors(action)}`}>
      {label}
    </span>
  );
}

export function AuditTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden bg-card">
        <div className="space-y-4 p-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.logs || data.logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg bg-card shadow-sm border-dashed">
        <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-4">
          <RiHistoryLine className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium">No activity yet</h3>
        <p className="text-sm text-muted-foreground">Audit logs will appear here when actions are performed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <ActionBadge action={log.action} />
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {log.documentId ? 'Document' : log.shareGrantId ? 'Share Grant' : 'System'}
                  <div className="text-xs text-muted-foreground font-mono mt-0.5 opacity-70">
                    {log.documentId || log.shareGrantId || '-'}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {log.actorLabel || 'System'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono text-xs">
                  {log.ipAddress || '-'}
                </TableCell>
                <TableCell className="text-right text-sm whitespace-nowrap" title={format(new Date(log.createdAt), 'PPpp')}>
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(() => {
        const totalPages = Math.ceil((data.total || 0) / 20) || 1;
        return (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} ({data.total} total events)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="gap-1"
              >
                <RiArrowLeftSLine className="w-4 h-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="gap-1"
              >
                Next <RiArrowRightSLine className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
