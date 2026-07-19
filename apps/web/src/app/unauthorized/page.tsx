import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-10 text-center">
      <h1 className="text-xl font-semibold">You don&apos;t have access to this</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Either you&apos;re not signed in, or your account doesn&apos;t have a role in this organization.
      </p>
      <Link href="/sign-in" className="inline-block text-sm font-medium text-sky-600 hover:underline dark:text-sky-400">
        Sign in
      </Link>
    </div>
  );
}
