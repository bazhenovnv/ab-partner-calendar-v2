import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f1f1f1]">
      <SiteHeader />
      <main id="main-content" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
