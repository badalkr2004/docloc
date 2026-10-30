'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  RiGoogleFill,
  RiCloudLine,
  RiLinkUnlink,
  RiUploadCloud2Line,
  RiDownloadCloud2Line,
  RiLoader4Line,
  RiExternalLinkLine,
  RiShieldKeyholeLine,
} from '@remixicon/react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { runGoogleDriveBackup, type BackupProgress } from '@/lib/backup/run-backup';
import { runGoogleDriveRestore } from '@/lib/backup/run-restore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCryptoStore } from '@/stores/crypto-store';

type BackupStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  connectedAt: string | null;
  backups: Array<{
    id: string;
    label: string;
    documentCount: number;
    totalBytes: number;
    status: string;
    driveFolderUrl: string | null;
    createdAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  }>;
};

type RemoteFolder = {
  id: string;
  name: string;
  createdTime?: string;
  webViewLink?: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUnlocked = useCryptoStore((s) => s.isUnlocked);

  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [remoteFolders, setRemoteFolders] = useState<RemoteFolder[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await apiClient.get<BackupStatus>('/api/backup/drive/status');
      setStatus(data);
    } catch {
      toast.error('Failed to load backup status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const flag = searchParams.get('backup');
    if (!flag) return;
    if (flag === 'connected') {
      toast.success('Google Drive connected');
      refresh();
    } else if (flag === 'error') {
      toast.error(`Drive connect failed: ${searchParams.get('reason') || 'unknown'}`);
    }
    router.replace('/settings');
  }, [searchParams, refresh, router]);

  const loadRemote = async () => {
    try {
      setBusy(true);
      const { data } = await apiClient.get<{ folders: RemoteFolder[] }>(
        '/api/backup/drive/list-remote'
      );
      setRemoteFolders(data.folders || []);
      if (!data.folders?.length) toast.message('No Docloc backup folders found on Drive');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not list Drive backups');
    } finally {
      setBusy(false);
    }
  };

  const handleBackup = async () => {
    if (!isUnlocked) {
      toast.error('Unlock your vault before backing up');
      document.dispatchEvent(new CustomEvent('open-passphrase-modal'));
      return;
    }
    try {
      setBusy(true);
      setProgress({ phase: 'meta', current: 0, total: 0, message: 'Starting…' });
      const result = await runGoogleDriveBackup(setProgress);
      toast.success(
        `Backed up ${result.documentCount} encrypted document${result.documentCount !== 1 ? 's' : ''} (${formatBytes(result.totalBytes)})`
      );
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Backup failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Drive? Existing backup folders on Drive are kept.')) return;
    try {
      setBusy(true);
      await apiClient.post('/api/backup/drive/disconnect');
      toast.success('Google Drive disconnected');
      setRemoteFolders([]);
      await refresh();
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (folderId: string, name: string) => {
    if (
      !confirm(
        `Restore "${name}" into this vault?\n\nDocuments are re-imported as new encrypted copies. This does not delete existing vault files.`
      )
    ) {
      return;
    }
    try {
      setRestoringId(folderId);
      setBusy(true);
      setProgress({ phase: 'meta', current: 0, total: 0, message: 'Starting restore…' });
      const result = await runGoogleDriveRestore(folderId, (p) => {
        setProgress({
          phase: p.phase === 'done' ? 'done' : p.phase === 'error' ? 'error' : 'files',
          current: p.current,
          total: p.total,
          message: p.message,
        });
      });
      toast.success(
        `Restored ${result.restoredDocuments} documents, ${result.restoredFolders} folders, ${result.restoredBuckets} buckets`
      );
      await refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Restore failed');
    } finally {
      setRestoringId(null);
      setBusy(false);
      setProgress(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiCloudLine className="w-5 h-5" />
            Google Drive Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading…</CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiCloudLine className="w-5 h-5" />
            Google Drive Backup
          </CardTitle>
          <CardDescription>
            Add <code className="text-xs">GOOGLE_CLIENT_ID</code> and{' '}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code> to enable Drive backups. See
            .env.example.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : progress?.phase === 'done'
        ? 100
        : progress
          ? 5
          : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiCloudLine className="w-5 h-5" />
          Google Drive Backup
        </CardTitle>
        <CardDescription className="space-y-1">
          <span className="flex items-start gap-2">
            <RiShieldKeyholeLine className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            Backups store encrypted ciphertext and your passphrase-wrapped key only. File bytes go
            browser → Drive (not through our servers). Google and Docloc cannot read your documents.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">
              {status.connected ? 'Connected' : 'Not connected'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status.connected
                ? status.googleEmail || 'Google Drive linked'
                : 'Link Drive to create encrypted vault backups'}
            </p>
          </div>
          <div className="flex gap-2">
            {status.connected ? (
              <Button variant="outline" onClick={handleDisconnect} disabled={busy} className="gap-2">
                <RiLinkUnlink className="w-4 h-4" />
                Disconnect
              </Button>
            ) : (
              <Button
                className="gap-2"
                disabled={busy}
                onClick={() => {
                  window.location.href = '/api/backup/drive/connect';
                }}
              >
                <RiGoogleFill className="w-4 h-4" />
                Connect Google Drive
              </Button>
            )}
          </div>
        </div>

        {status.connected && (
          <>
            <div className="space-y-3">
              <Button className="w-full gap-2" size="lg" onClick={handleBackup} disabled={busy}>
                {busy && progress ? (
                  <RiLoader4Line className="w-4 h-4 animate-spin" />
                ) : (
                  <RiUploadCloud2Line className="w-4 h-4" />
                )}
                {busy && progress ? progress.message : 'Backup vault to Drive now'}
              </Button>
              {progress && (
                <div className="space-y-1.5">
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress.total > 0
                      ? `${progress.current}/${progress.total} — ${progress.message}`
                      : progress.message}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Recent backups</h4>
                <Button variant="ghost" size="sm" onClick={loadRemote} disabled={busy}>
                  Scan Drive
                </Button>
              </div>

              {status.backups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No backups yet.</p>
              ) : (
                <ul className="space-y-2">
                  {status.backups.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{b.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.documentCount} docs · {formatBytes(b.totalBytes)} ·{' '}
                          {format(new Date(b.createdAt), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            b.status === 'complete'
                              ? 'default'
                              : b.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {b.status}
                        </Badge>
                        {b.driveFolderUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            render={<a href={b.driveFolderUrl} target="_blank" rel="noreferrer" />}
                          >
                            <RiExternalLinkLine className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {remoteFolders.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium">Restore from Drive</h4>
                  {remoteFolders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{f.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 shrink-0"
                        disabled={busy || restoringId === f.id}
                        onClick={() => handleRestore(f.id, f.name)}
                      >
                        {restoringId === f.id ? (
                          <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RiDownloadCloud2Line className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
