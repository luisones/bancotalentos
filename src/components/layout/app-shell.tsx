import { AppHeader } from "./app-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--liceu-bg)]">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
