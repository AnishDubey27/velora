import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense>
      <LoginForm initialMessage={resolvedSearchParams?.message} />
    </Suspense>
  );
}
