"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { LogoMark } from "@/components/Icons";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("email", email.trim());
      formData.set("password", password);
      formData.set("flow", "signIn");
      await signIn("password", formData);
    } catch {
      setError("No se pudo iniciar sesión. Revisá email y contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_#fafaf9_45%,_#fffbeb_100%)]" />
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />

      <Card className="anim-page relative w-full max-w-md overflow-hidden border-stone-200/80 shadow-xl shadow-stone-900/5">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-700 via-teal-500 to-amber-400" />
        <div className="p-6 sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-3xl p-1 shadow-lg shadow-teal-900/10 ring-1 ring-white/60">
              <LogoMark size={64} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Auralis
            </h1>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-stone-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Turnos y consultorio, claros y a mano
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                <Input
                  id="login-email"
                  className="pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                <Input
                  id="login-password"
                  className="pl-10 pr-11"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label={showPass ? "Ocultar" : "Mostrar"}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-100"
              >
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Esperá...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Ingresar
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
