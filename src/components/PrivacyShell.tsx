"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, ShieldCheck } from "lucide-react";
import { Nav } from "./Nav";
import { PrivacyContext } from "./PrivacyContext";

export function PrivacyShell({
  children,
  idleTimeoutMinutes,
}: {
  children: ReactNode;
  idleTimeoutMinutes: number;
}) {
  const [privacyMode, setPrivacyMode] = useState(false);
  const unlockButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("privacy-mode", privacyMode);

    if (privacyMode) {
      root.dataset.privacyMode = "on";
    } else {
      delete root.dataset.privacyMode;
    }

    return () => {
      root.classList.remove("privacy-mode");
      delete root.dataset.privacyMode;
    };
  }, [privacyMode]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") setPrivacyMode(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (privacyMode || idleTimeoutMinutes <= 0) return;

    let timeout = window.setTimeout(
      () => setPrivacyMode(true),
      idleTimeoutMinutes * 60_000,
    );

    function resetIdleTimeout() {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(
        () => setPrivacyMode(true),
        idleTimeoutMinutes * 60_000,
      );
    }

    const activityEvents = ["pointerdown", "keydown", "touchstart"] as const;
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, resetIdleTimeout, { passive: true }),
    );

    return () => {
      window.clearTimeout(timeout);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, resetIdleTimeout),
      );
    };
  }, [idleTimeoutMinutes, privacyMode]);

  useEffect(() => {
    if (!privacyMode) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const appShell = document.querySelector<HTMLElement>("[data-app-shell]");
    const appShellState = appShell
      ? {
          inert: appShell.inert,
          ariaHidden: appShell.getAttribute("aria-hidden"),
        }
      : null;

    if (appShell) {
      appShell.inert = true;
      appShell.setAttribute("aria-hidden", "true");
    }

    const modalStates = Array.from(
      document.querySelectorAll<HTMLElement>("[data-modal-root]"),
    ).map((element) => ({ element, inert: element.inert }));

    modalStates.forEach(({ element }) => {
      element.inert = true;
    });

    const frame = window.requestAnimationFrame(() =>
      unlockButtonRef.current?.focus(),
    );

    return () => {
      window.cancelAnimationFrame(frame);
      modalStates.forEach(({ element, inert }) => {
        if (element.isConnected) element.inert = inert;
      });
      if (appShell && appShellState && appShell.isConnected) {
        appShell.inert = appShellState.inert;
        if (appShellState.ariaHidden === null) {
          appShell.removeAttribute("aria-hidden");
        } else {
          appShell.setAttribute("aria-hidden", appShellState.ariaHidden);
        }
      }
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    };
  }, [privacyMode]);

  const privacyScreen =
    privacyMode && typeof document !== "undefined"
      ? createPortal(
          <div
            data-privacy-exempt
            data-privacy-shield
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-lock-title"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-50/95 p-5 backdrop-blur-xl"
          >
            <div className="anim-fade-in w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-xl shadow-stone-900/10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <ShieldCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <h2
                id="privacy-lock-title"
                className="text-lg font-semibold tracking-tight text-stone-900"
              >
                Contenido privado oculto
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                La información del consultorio permanece oculta en este
                dispositivo.
              </p>
              <button
                ref={unlockButtonRef}
                type="button"
                onClick={() => setPrivacyMode(false)}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-md shadow-teal-900/10 transition hover:bg-teal-800 active:scale-[0.98]"
              >
                <Eye className="h-5 w-5" aria-hidden="true" />
                Mostrar contenido
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <PrivacyContext.Provider value={{ privacyMode, setPrivacyMode }}>
      <div data-app-shell className="min-h-screen pb-24 sm:pb-8">
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <Nav />
        <main
          id="main-content"
          tabIndex={-1}
          data-private-content
          aria-hidden={privacyMode ? "true" : undefined}
          inert={privacyMode ? true : undefined}
          className="safe-inline mx-auto max-w-6xl py-4 sm:py-6"
        >
          {children}
        </main>
      </div>
      {privacyScreen}
    </PrivacyContext.Provider>
  );
}
