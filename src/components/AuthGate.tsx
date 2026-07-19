"use client";

import { useConvexAuth } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { SeedOnLogin } from "./SeedOnLogin";
import { LogoMark } from "./Icons";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.replace("/login");
    }
    if (!isLoading && isAuthenticated && pathname === "/login") {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="anim-fade-in text-center">
          <div className="mx-auto mb-3 w-fit animate-pulse">
            <LogoMark size={48} />
          </div>
          <p className="text-sm text-stone-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (pathname === "/login") return <>{children}</>;
    return null;
  }

  return (
    <>
      <SeedOnLogin />
      {children}
    </>
  );
}
