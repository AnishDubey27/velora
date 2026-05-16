"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function login(formData: FormData) {
  const supabase = createClient(await cookies());
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) redirect("/login?message=" + encodeURIComponent(error.message));

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = createClient(await cookies());
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9999';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });
  if (error) redirect("/login?message=" + encodeURIComponent(error.message));

  if (!data.session) {
    redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account, then sign in."));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPassword(formData: FormData) {
  const supabase = createClient(await cookies());
  const email = formData.get("email") as string;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9999';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error) redirect("/login?message=" + encodeURIComponent(error.message));

  redirect("/login?message=" + encodeURIComponent("Password reset link sent! Please check your email."));
}

export async function updatePassword(formData: FormData) {
  const supabase = createClient(await cookies());
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?message=" + encodeURIComponent(error.message));

  redirect("/login?message=" + encodeURIComponent("Password updated successfully! Please sign in."));
}

