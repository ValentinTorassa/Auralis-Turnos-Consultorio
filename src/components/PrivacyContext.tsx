"use client";

import { createContext, Dispatch, SetStateAction, useContext } from "react";

type PrivacyContextValue = {
  privacyMode: boolean;
  setPrivacyMode: Dispatch<SetStateAction<boolean>>;
};

export const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function usePrivacyMode() {
  const context = useContext(PrivacyContext);

  if (!context) {
    throw new Error("usePrivacyMode debe usarse dentro de PrivacyShell");
  }

  return context;
}
