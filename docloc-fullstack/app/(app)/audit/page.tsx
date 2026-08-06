'use client';

import { AuditTable } from '@/components/audit/audit-table';

export default function AuditPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          View a complete, immutable history of all actions performed in your vault.
        </p>
      </div>

      <AuditTable />
    </div>
  );
}
