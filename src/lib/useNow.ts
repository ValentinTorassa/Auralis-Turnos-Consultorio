"use client";

import { useEffect, useState } from "react";

/**
 * Reloj reactivo: 0 hasta el primer tick (post-montaje) para mantener el
 * render puro; después se actualiza cada `intervalMs`.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const raf = requestAnimationFrame(update);
    const timer = setInterval(update, intervalMs);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
