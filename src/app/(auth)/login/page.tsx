"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button, Card, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-teal-50 to-stone-50">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white text-lg font-bold">
            AC
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Agenda Consultorio
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Tu agenda personal, clara y sincronizada
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1">
          <button
            type="button"
            onClick={() => setMode("signIn")}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${
              mode === "signIn"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signUp")}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${
              mode === "signUp"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signUp" && (
            <div>
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? "Esperá..."
              : mode === "signIn"
                ? "Ingresar"
                : "Crear cuenta"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
