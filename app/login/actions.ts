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

  try {
    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) redirect("/login?message=" + encodeURIComponent(error.message));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach auth server.";
    redirect("/login?message=" + encodeURIComponent(message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = createClient(await cookies());
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  try {
    const { error } = await supabase.auth.signUp(data);
    if (error) redirect("/login?message=" + encodeURIComponent(error.message));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach auth server.";
    redirect("/login?message=" + encodeURIComponent(message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}
