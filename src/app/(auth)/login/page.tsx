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
  UserPlus,
  UserRound,
} from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      formData.set("flow", mode);
      if (mode === "signUp" && name.trim()) {
        formData.set("name", name.trim());
      }
      await signIn("password", formData);
    } catch {
      setError(
        mode === "signIn"
          ? "No se pudo iniciar sesión. Revisá email y contraseña."
          : "No se pudo crear la cuenta. ¿El email ya está registrado?",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_#fafaf9_45%,_#fffbeb_100%)]" />
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />

      <Card className="relative w-full max-w-md overflow-hidden border-stone-200/80 shadow-xl shadow-stone-900/5">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-700 via-teal-500 to-amber-400" />
        <div className="p-6 sm:p-8">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-3xl p-1 shadow-lg shadow-teal-900/10 ring-1 ring-white/60">
              <LogoMark size={64} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Agenda Consultorio
            </h1>
            <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-stone-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Tu día, claro y a mano
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-stone-100/90 p-1 ring-1 ring-stone-200/60">
            <button
              type="button"
              onClick={() => setMode("signIn")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "signIn"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signUp")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "signUp"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signUp" && (
              <div>
                <Label>Nombre</Label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                  <Input
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                <Input
                  className="pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <Label>Contraseña</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-stone-400" />
                <Input
                  className="pl-10 pr-11"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signIn" ? "current-password" : "new-password"
                  }
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
              <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-100">
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
              ) : mode === "signIn" ? (
                <>
                  <LogIn className="h-5 w-5" />
                  Ingresar
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Crear cuenta
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
