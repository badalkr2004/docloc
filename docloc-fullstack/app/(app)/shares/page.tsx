'use client';

import { useShareGrants, useRevokeGrant } from '@/lib/api/hooks/use-share';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RiShareLine, RiLinksLine, RiTimeLine, RiCloseCircleLine } from '@remixicon/react';
import { toast } from 'sonner';

export default function SharesPage() {
  const { data: shares, isLoading } = useShareGrants();
  const revokeGrant = useRevokeGrant();

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this share link? Recipients will immediately lose access.')) {
      return;
    }
    
    try {
      await revokeGrant.mutateAsync(id);
      toast.success('Share link revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke share link');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeShares = shares?.filter(s => !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt) > new Date())) || [];
  const inactiveShares = shares?.filter(s => !!s.revokedAt || (!!s.expiresAt && new Date(s.expiresAt) <= new Date())) || [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Shared Links</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage active share links and track access to your documents.</p>
      </div>

      {!shares || shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-card shadow-sm border-dashed">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <RiLinksLine className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No active shares</h3>
          <p className="text-muted-foreground max-w-sm mb-6">You haven't shared any documents yet. Go to your Cart to create secure share links.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeShares.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Active Shares
              </h2>
              <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Security</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeShares.map((share) => (
                      <TableRow key={share.id}>
                        <TableCell className="font-medium">
                          {share.recipientEmail || share.recipientPhone || 'Anonymous Link'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={share.accessType === 'download' ? 'default' : 'secondary'}>
                            {share.accessType === 'download' ? 'Download' : 'View Only'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {share.requireOtp ? (
                            <Badge variant="outline" className="text-xs">OTP Required</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">Link Only</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {share.expiresAt ? formatDistanceToNow(new Date(share.expiresAt), { addSuffix: true }) : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevoke(share.id)}
                            disabled={revokeGrant.isPending}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {inactiveShares.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                Past Shares
              </h2>
              <div className="border rounded-lg overflow-hidden bg-card/50 shadow-sm opacity-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Access</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inactiveShares.map((share) => {
                      const isExpired = !!share.expiresAt && new Date(share.expiresAt) <= new Date() && !share.revokedAt;
                      return (
                        <TableRow key={share.id}>
                          <TableCell className="font-medium text-muted-foreground">
                            {share.recipientEmail || share.recipientPhone || 'Anonymous Link'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground capitalize">{share.accessType}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={share.revokedAt ? 'border-destructive text-destructive' : ''}>
                              {share.revokedAt ? 'Revoked' : 'Expired'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(share.createdAt), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
