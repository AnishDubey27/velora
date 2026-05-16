"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Github, ArrowRight, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import { login, signup, forgotPassword } from "./actions";

function SubmitButton({ mode }: { mode: "signin" | "signup" | "forgot" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden rounded-xl bg-vel-teal py-3.5 text-sm font-bold text-vel-bg transition-all hover:bg-vel-teal/90 disabled:opacity-70 mt-2"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {pending ? (
          "Processing..."
        ) : (
          <>
            {mode === "signin" && "Sign In"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Send Reset Link"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
    </button>
  );
}

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  const message = inlineMessage ?? initialMessage ?? null;

  const formAction = mode === "signin" ? login : mode === "signup" ? signup : forgotPassword;

  const handleSocialLogin = () => {
    setInlineMessage("Social login coming soon!");
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-vel-bg">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vel-teal/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-vel-green/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="glassy rounded-3xl p-8 shadow-card border border-white/5 relative overflow-hidden">
          {/* Subtle top border glow */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-vel-teal/50 to-transparent" />

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-vel-teal/10 mb-4"
            >
              <Sparkles className="h-6 w-6 text-vel-teal" />
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              {mode === "forgot" ? "Reset Password" : "Welcome to Velora"}
            </h1>
            <p className="text-vel-muted text-sm">
              {mode === "signin" && "Sign in to continue to your workspace"}
              {mode === "signup" && "Create an account to get started"}
              {mode === "forgot" && "Enter your email to receive a reset link"}
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-vel-muted" />
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 py-3.5 text-white placeholder:text-vel-faint focus:border-vel-teal focus:ring-1 focus:ring-vel-teal focus:outline-none transition-all"
                />
              </div>
              
              <AnimatePresence mode="wait">
                {mode !== "forgot" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-vel-muted" />
                    <input
                      name="password"
                      type="password"
                      placeholder="Password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required={mode !== "forgot"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 py-3.5 text-white placeholder:text-vel-faint focus:border-vel-teal focus:ring-1 focus:ring-vel-teal focus:outline-none transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {mode === "signin" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-vel-teal hover:text-vel-teal/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-vel-teal/10 border border-vel-teal/20 px-4 py-3 text-sm text-vel-text overflow-hidden"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-vel-teal" />
                  <p>{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <SubmitButton mode={mode} />
          </form>

          {mode !== "forgot" && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-white/10"></div>
                <span className="px-4 text-xs font-medium text-vel-muted uppercase tracking-wider">
                  or continue with
                </span>
                <div className="flex-1 border-t border-white/10"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSocialLogin}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={handleSocialLogin}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </div>
            </>
          )}

          <div className="mt-8 text-center">
            {mode === "forgot" ? (
              <button
                onClick={() => setMode("signin")}
                className="flex items-center justify-center gap-2 w-full text-sm text-vel-muted hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-sm text-vel-muted hover:text-white transition-colors"
              >
                {mode === "signin"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

