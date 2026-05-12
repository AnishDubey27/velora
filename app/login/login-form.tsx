"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"signin" | "signup" | null>(null);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  const message = inlineMessage ?? initialMessage ?? null;

  async function handleSignIn() {
    setInlineMessage(null);
    setPending("signin");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setInlineMessage(error.message);
        return;
      }
      router.replace("/");
    } catch (error) {
      setInlineMessage(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setPending(null);
    }
  }

  async function handleSignUp() {
    setInlineMessage(null);
    setPending("signup");
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setInlineMessage(error.message);
        return;
      }

      if (!data.session) {
        setInlineMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      router.replace("/");
    } catch (error) {
      setInlineMessage(error instanceof Error ? error.message : "Sign up failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-vel-bg px-4">
      <div className="w-full max-w-sm rounded-3xl glassy p-8 shadow-card">
        <h1 className="mb-6 text-3xl font-semibold tracking-tighter text-white">
          Initialize<span className="text-vel-teal">.</span>
        </h1>

        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <input
            name="email"
            type="email"
            placeholder="Email address"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-vel-teal focus:outline-none"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/30 focus:border-vel-teal focus:outline-none"
          />

          {message && <p className="mt-2 text-sm text-red-400">{message}</p>}

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={pending !== null}
              className="flex-1 rounded-xl bg-vel-teal py-3 text-sm font-semibold text-vel-bg transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {pending === "signin" ? "Signing In..." : "Sign In"}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={pending !== null}
              className="flex-1 rounded-xl border border-white/10 bg-transparent py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-60"
            >
              {pending === "signup" ? "Signing Up..." : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

