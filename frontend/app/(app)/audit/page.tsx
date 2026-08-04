'use client';

import { AuditTable } from '@/components/audit/audit-table';

export default function AuditPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">
          View a complete, immutable history of all actions performed in your vault.
        </p>
      </div>

      <AuditTable />
    </div>
  );
}
