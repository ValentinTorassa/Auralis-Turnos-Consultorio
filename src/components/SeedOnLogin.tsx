"use client";

import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import { useEffect, useRef } from "react";

export function SeedOnLogin() {
  const ensureSeeded = useMutation({
    mutationFn: useConvexMutation(api.users.ensureSeeded),
  });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void ensureSeeded.mutateAsync({}).catch(() => {
      ran.current = false;
    });
  }, [ensureSeeded]);

  return null;
}
