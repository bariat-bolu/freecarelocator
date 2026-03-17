'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SaveButtonProps {
  clinicId: string;
  /** 'card' renders a compact icon; 'detail' renders a wider button with text */
  variant?: 'card' | 'detail';
}

export default function SaveButton({
  clinicId,
  variant = 'card',
}: SaveButtonProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check auth + saved state on mount
  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from('saved_clinics')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('clinic_id', clinicId)
          .maybeSingle();

        setSaved(!!data);
      }

      setLoading(false);
    }

    init();

    // Listen for auth changes (login/logout while on page)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (!newUser) {
        setSaved(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [clinicId]);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      // Prevent the parent Link from navigating (for card variant)
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        setShowPrompt(true);
        return;
      }

      setToggling(true);

      try {
        const supabase = createClient();

        if (saved) {
          // Unsave
          const { error } = await supabase
            .from('saved_clinics')
            .delete()
            .eq('user_id', user.id)
            .eq('clinic_id', clinicId);

          if (!error) setSaved(false);
        } else {
          // Save
          const { error } = await supabase
            .from('saved_clinics')
            .insert({ user_id: user.id, clinic_id: clinicId });

          if (!error) setSaved(true);
        }
      } catch {
        // Silent fail — button state unchanged
      } finally {
        setToggling(false);
      }
    },
    [user, saved, clinicId]
  );

  // Dismiss prompt on click outside
  useEffect(() => {
    if (!showPrompt) return;
    const timer = setTimeout(() => setShowPrompt(false), 4000);
    return () => clearTimeout(timer);
  }, [showPrompt]);

  // Don't render anything while checking auth
  if (loading) {
    if (variant === 'detail') {
      return (
        <div className="bg-sage-muted/20 h-10 w-28 animate-pulse rounded-xl" />
      );
    }
    return (
      <div className="bg-sage-muted/20 h-8 w-8 animate-pulse rounded-full" />
    );
  }

  // ── Card variant: compact heart icon ──
  if (variant === 'card') {
    return (
      <div className="relative">
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={saved ? 'Unsave clinic' : 'Save clinic'}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
            saved
              ? 'bg-red-50 text-red-500 hover:bg-red-100'
              : 'bg-sage-bg text-sage-muted hover:bg-sage-accent/20 hover:text-sage-primary'
          } ${toggling ? 'opacity-50' : ''}`}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        {/* Login prompt tooltip */}
        {showPrompt && (
          <div className="border-sage-muted/40 absolute top-full right-0 z-10 mt-2 w-48 rounded-xl border bg-white p-3 shadow-lg">
            <p className="text-sage-text/70 text-xs">
              Sign in to save clinics.
            </p>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push('/login');
              }}
              className="bg-sage-primary hover:bg-sage-primary/90 mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Detail variant: wider button with text ──
  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
          saved
            ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
            : 'border-sage-muted text-sage-text/70 hover:border-sage-primary hover:text-sage-primary border bg-white'
        } ${toggling ? 'opacity-50' : ''}`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
        {toggling ? 'Saving…' : saved ? 'Saved' : 'Save clinic'}
      </button>

      {/* Login prompt */}
      {showPrompt && (
        <div className="border-sage-muted/40 absolute top-full left-0 z-10 mt-2 w-52 rounded-xl border bg-white p-3 shadow-lg">
          <p className="text-sage-text/70 text-xs">
            Sign in to save clinics to your list.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-sage-primary hover:bg-sage-primary/90 mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
