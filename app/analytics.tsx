'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { pageVisit } from '../lib/analytics';

export function Analytics() {
  const path = usePathname();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    // Count route visits, not hydration, rerenders, query changes or Strict Mode replays.
    if (path === lastPath.current) return;
    lastPath.current = path;
    pageVisit(path === '/privacy' ? '/privacy/' : path);
  }, [path]);
  return null;
}
