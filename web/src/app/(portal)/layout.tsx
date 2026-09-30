import type { ReactNode } from 'react';
import { PortalShell } from '@/components/portal/shell';

export default function CustomerPortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell portal="customer">{children}</PortalShell>;
}
