import Link from 'next/link';
import AuthHeader from '@/components/AuthHeader';

export default function NotFound() {
  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="font-display text-sage-muted text-6xl font-bold">404</p>
          <h1 className="font-display text-sage-text mt-4 text-xl font-semibold">
            Page not found
          </h1>
          <p className="text-sage-text/50 mt-2 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link
            href="/"
            className="bg-sage-primary hover:bg-sage-primary/90 mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Back to search
          </Link>
        </div>
      </main>
    </div>
  );
}
