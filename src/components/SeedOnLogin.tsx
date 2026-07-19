"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export function SeedOnLogin() {
  const ensureSeeded = useMutation(api.users.ensureSeeded);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void ensureSeeded().catch(() => {
      ran.current = false;
    });
  }, [ensureSeeded]);

  return null;
}
