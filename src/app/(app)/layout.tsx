import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-24 sm:pb-8">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <Nav />
      <main
        id="main-content"
        tabIndex={-1}
        className="safe-inline mx-auto max-w-6xl py-4 sm:py-6 lg:py-8"
      >
        {children}
      </main>
    </div>
  );
}
