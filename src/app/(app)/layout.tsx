import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-24 sm:pb-8">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">{children}</main>
    </div>
  );
}
