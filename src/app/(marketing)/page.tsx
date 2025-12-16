"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Role = "student" | "teacher";

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Teacher form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Student form
  const [username, setUsername] = useState("");
  const [sessionCode, setSessionCode] = useState("");

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenciales incorrectas");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/student/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sessionCode }),
      });

      const data = await res.json();

      if (res.ok) {
        // Store student session info
        localStorage.setItem("studentSession", JSON.stringify(data));
        router.push("/class/session");
      } else {
        setError(data.error || "Error al unirse a la sesión");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen surface-base flex flex-col items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-blue-600 text-white shadow-lg shadow-[var(--color-primary)]/30 mb-4">
            <span className="material-symbols-outlined text-3xl">
              center_focus_strong
            </span>
          </div>
          <h1 className="text-heading-xl">
            <span className="text-white">Classroom</span>{" "}
            <span className="text-[var(--color-primary)]">Focus</span>
          </h1>
          <p className="text-body mt-2">
            Monitorea y mejora la atención de tus estudiantes
          </p>
        </div>

        {/* Role Selector */}
        {!role ? (
          <div className="surface-card p-6">
            <p className="text-center text-body mb-6">Soy un...</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRole("student")}
                className="surface-card-interactive p-6 flex flex-col items-center gap-3 group"
              >
                <div className="icon-container-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">
                    school
                  </span>
                </div>
                <span className="text-heading text-sm">Estudiante</span>
              </button>
              <button
                onClick={() => setRole("teacher")}
                className="surface-card-interactive p-6 flex flex-col items-center gap-3 group"
              >
                <div className="icon-container-lg icon-primary group-hover:bg-[var(--color-primary)]/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">
                    person
                  </span>
                </div>
                <span className="text-heading text-sm">Profesor</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="surface-card p-6">
            {/* Back button */}
            <button
              onClick={() => {
                setRole(null);
                setError("");
              }}
              className="flex items-center gap-1 text-body text-sm mb-6 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              Volver
            </button>

            {/* Role Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`icon-container-md ${
                  role === "student"
                    ? "bg-purple-500/10 text-purple-400"
                    : "icon-primary"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {role === "student" ? "school" : "person"}
                </span>
              </div>
              <div>
                <h2 className="text-heading text-lg">
                  {role === "student" ? "Acceso Estudiante" : "Acceso Profesor"}
                </h2>
                <p className="text-caption">
                  {role === "student"
                    ? "Ingresa a tu sesión de clase"
                    : "Inicia sesión en tu cuenta"}
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Teacher Form */}
            {role === "teacher" && (
              <form onSubmit={handleTeacherLogin} className="flex flex-col gap-4">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn-lg w-full mt-2"
                >
                  {loading ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </button>
              </form>
            )}

            {/* Student Form */}
            {role === "student" && (
              <form onSubmit={handleStudentLogin} className="flex flex-col gap-4">
                <div className="form-group">
                  <label htmlFor="username" className="form-label">
                    Tu nombre
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-input"
                    placeholder="Ej: Juan García"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sessionCode" className="form-label">
                    Código de sesión
                  </label>
                  <input
                    type="text"
                    id="sessionCode"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    className="form-input text-center text-lg tracking-widest font-mono"
                    placeholder="ABC123"
                    maxLength={6}
                    required
                  />
                  <p className="form-hint">
                    Pide el código a tu profesor
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn-lg w-full mt-2 bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? (
                    <>
                      <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    "Unirse a la Clase"
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-caption text-center mt-8">
          &copy; {new Date().getFullYear()} Classroom Focus Tracker
        </p>
      </div>
    </div>
  );
}
