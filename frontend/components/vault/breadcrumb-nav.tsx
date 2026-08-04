'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiHome4Line, RiFolderLine, RiArrowRightSLine } from '@remixicon/react';
import { useFolderBreadcrumbs } from '@/lib/api/hooks/use-folders';

interface BreadcrumbNavProps {
  folderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export function BreadcrumbNav({ folderId, onNavigate }: BreadcrumbNavProps) {
  // Using useFolderBreadcrumbs. If folderId is null, it should ideally not fetch or return empty array.
  const { data: breadcrumbs = [] } = useFolderBreadcrumbs(folderId);

  return (
    <div className="flex items-center gap-1 flex-wrap text-sm">
      <AnimatePresence mode="popLayout">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="flex items-center"
        >
          <button
            onClick={() => onNavigate(null)}
            className={`flex items-center gap-1 hover:text-primary transition-colors ${
              !folderId ? 'font-semibold text-foreground cursor-default' : 'text-muted-foreground'
            }`}
            disabled={!folderId}
          >
            <RiHome4Line className="w-4 h-4" />
            <span>Vault</span>
          </button>
        </motion.div>

        {folderId && breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <React.Fragment key={crumb.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-muted-foreground/50 flex items-center"
              >
                <RiArrowRightSLine className="w-4 h-4" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center"
              >
                <button
                  onClick={() => !isLast && onNavigate(crumb.id)}
                  className={`flex items-center gap-1 hover:text-primary transition-colors ${
                    isLast ? 'font-semibold text-foreground cursor-default' : 'text-muted-foreground'
                  }`}
                  disabled={isLast}
                >
                  <RiFolderLine className="w-4 h-4" />
                  <span className="truncate max-w-[120px]">{crumb.name}</span>
                </button>
              </motion.div>
            </React.Fragment>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
