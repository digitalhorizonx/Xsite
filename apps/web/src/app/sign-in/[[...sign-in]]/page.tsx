import { SignIn } from '@clerk/nextjs';
import { isClerkConfigured } from '@/lib/auth/config';

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="mx-auto max-w-md p-10 text-center text-sm text-slate-500">
        Sign-in is not yet configured for this environment. See docs/AUTHENTICATION.md.
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <SignIn />
    </div>
  );
}
