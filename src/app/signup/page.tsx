import Link from "next/link";

import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="glass w-full max-w-sm rounded-xl p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
            Business OS
          </p>
          <h1 className="mt-1 text-xl font-semibold">Create Owner Account</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            The first account created becomes the Owner. Everyone after is a
            read-only Viewer until promoted.
          </p>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
