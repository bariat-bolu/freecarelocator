'use client';

import { useRouter } from 'next/navigation';

export default function BackToSearch() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="text-sage-text/50 hover:text-sage-primary mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M15 19l-7-7 7-7" />
      </svg>
      Back to search
    </button>
  );
}
