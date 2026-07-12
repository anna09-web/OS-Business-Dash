import Link from "next/link";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string }>;
}) {
  const { confirm } = await searchParams;

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="glass w-full max-w-sm rounded-xl p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Business OS
          </p>
          <h1 className="mt-1 text-xl font-semibold">Command Center Login</h1>
        </div>

        {confirm && (
          <p className="mb-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            Check your email to confirm your account, then log in.
          </p>
        )}

        <LoginForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account yet?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
