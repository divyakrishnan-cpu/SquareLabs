"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

const SAVED_EMAIL_KEY = "sl_saved_email";

export default function LoginPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  // Pre-fill saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    } else {
      setEmail("divya.krishnan@squareyards.com");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (rememberMe) {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">SY</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">SquareLabs</span>
          </div>
          <p className="text-sm text-gray-500">Marketing Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 transition-shadow"
                placeholder="you@squareyards.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 transition-shadow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-gray-500 cursor-pointer select-none">
                Remember my email
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60 shadow-sm mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Square Yards · Internal use only
        </p>
      </div>
    </div>
  );
}
