export default function ClinicDetailLoading() {
  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      {/* Header placeholder */}
      <div className="border-sage-muted/40 border-b bg-white/60 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="bg-sage-muted/30 h-9 w-40 animate-pulse rounded-xl" />
          <div className="bg-sage-muted/20 h-8 w-24 animate-pulse rounded-xl" />
        </div>
      </div>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Back link */}
          <div className="bg-sage-muted/20 mb-6 h-4 w-28 animate-pulse rounded" />

          {/* Card */}
          <div className="border-sage-muted/40 animate-pulse rounded-2xl border bg-white shadow-sm">
            {/* Header */}
            <div className="border-sage-muted/30 border-b px-6 py-6 sm:px-8">
              <div className="bg-sage-muted/30 h-7 w-3/4 rounded-lg" />
              <div className="bg-sage-muted/20 mt-3 h-4 w-1/2 rounded-lg" />
            </div>

            {/* Body */}
            <div className="space-y-6 px-6 py-6 sm:px-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="bg-sage-muted/20 h-8 w-8 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-sage-muted/15 h-3 w-16 rounded" />
                    <div className="bg-sage-muted/20 h-4 w-2/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
