'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AuthHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="border-sage-muted/40 border-b bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="bg-sage-primary flex h-9 w-9 items-center justify-center rounded-xl"
            aria-hidden="true"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" />
            </svg>
          </div>
          <span className="font-display text-sage-primary text-xl font-semibold tracking-tight">
            FreeCare Locator
          </span>
        </Link>

        {/* Nav */}
        <nav aria-label="Primary" className="flex items-center gap-4">
          {loading ? (
            <div className="bg-sage-muted/40 h-4 w-20 animate-pulse rounded" />
          ) : user ? (
            <>
              {/* Saved link — only for logged-in users */}
              <Link
                href="/saved"
                className="text-sage-text/60 hover:text-sage-primary flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                <span className="hidden sm:inline">Saved</span>
              </Link>

              <span
                className="text-sage-text/50 hidden text-sm sm:inline"
                title={user.email}
              >
                {user.email}
              </span>
              <Link
                href="/logout"
                className="border-sage-muted text-sage-text/70 hover:border-sage-primary hover:text-sage-primary rounded-xl border px-4 py-1.5 text-sm font-medium transition-colors"
              >
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sage-text/70 hover:text-sage-primary text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-sage-primary hover:bg-sage-primary/90 rounded-xl px-4 py-1.5 text-sm font-medium text-white transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
