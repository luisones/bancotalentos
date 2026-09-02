import { AppHeader } from "./app-header";

/**
 * Largura é escolhida por TIPO DE CONTEÚDO, não uma vez para o app: 1560px em
 * tela operacional densa, 720px em formulário e prosa. O shell dá o trilho
 * externo; páginas de formulário envolvem o conteúdo em <Measure>.
 *
 * O cap não vai no header — o conteúdo interno dele alinha ao mesmo trilho de
 * 1560 para o logo bater com o breadcrumb.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-ground">
      <AppHeader />
      <main className="mx-auto w-full max-w-shell flex-1 px-4 pb-12 md:px-6 xl:px-[30px]">
        {children}
      </main>
      <footer
        data-print-hidden
        className="text-meta mx-auto w-full max-w-shell px-4 py-5 text-subtle md:px-6 xl:px-[30px]"
      >
        Uso interno · contém dados pessoais de candidatos
      </footer>
    </div>
  );
}

/** Trilho estreito para formulário e leitura. */
export function Measure({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-measure">{children}</div>;
}
