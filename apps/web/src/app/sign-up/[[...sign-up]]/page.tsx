import { SignUp } from '@clerk/nextjs';
import { isClerkConfigured } from '@/lib/auth/config';

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="mx-auto max-w-md p-10 text-center text-sm text-slate-500">
        Sign-up is not yet configured for this environment. See docs/AUTHENTICATION.md.
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <SignUp />
    </div>
  );
}
