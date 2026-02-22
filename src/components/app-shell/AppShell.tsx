import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="tp-app-bg">
      <AppHeader />
      <main className="tp-main">
        <div className="tp-page">{children}</div>
      </main>
      <a className="tp-fab" href="/ai" aria-label="Assistant IA">
        <span className="tp-fab__inner">AI</span>
      </a>
    </div>
  );
}