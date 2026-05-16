"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { updatePassword } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden rounded-xl bg-vel-teal py-3.5 text-sm font-bold text-vel-bg transition-all hover:bg-vel-teal/90 disabled:opacity-70 mt-2"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {pending ? (
          "Updating..."
        ) : (
          <>
            Update Password
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
    </button>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-vel-bg">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-vel-teal/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-vel-green/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10 px-4"
      >
        <div className="glassy rounded-3xl p-8 shadow-card border border-white/5 relative overflow-hidden">
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
              Set New Password
            </h1>
            <p className="text-vel-muted text-sm">
              Please enter your new password below.
            </p>
          </div>

          <form action={updatePassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-vel-muted" />
              <input
                name="password"
                type="password"
                placeholder="New Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 py-3.5 text-white placeholder:text-vel-faint focus:border-vel-teal focus:ring-1 focus:ring-vel-teal focus:outline-none transition-all"
              />
            </div>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm overflow-hidden bg-vel-teal/10 border border-vel-teal/20 text-vel-teal"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <SubmitButton />
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
