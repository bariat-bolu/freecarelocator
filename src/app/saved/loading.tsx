export default function SavedLoading() {
  return (
    <div className="bg-sage-bg flex min-h-screen flex-col">
      <div className="border-sage-muted/40 border-b bg-white/60 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="bg-sage-muted/30 h-9 w-40 animate-pulse rounded-xl" />
          <div className="bg-sage-muted/20 h-8 w-24 animate-pulse rounded-xl" />
        </div>
      </div>

      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <div className="bg-sage-muted/20 mb-4 h-4 w-28 animate-pulse rounded" />
            <div className="bg-sage-muted/30 h-8 w-48 animate-pulse rounded-lg" />
            <div className="bg-sage-muted/20 mt-2 h-4 w-64 animate-pulse rounded" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-sage-muted/40 mb-3 animate-pulse rounded-2xl border bg-white p-5"
            >
              <div className="bg-sage-muted/30 h-5 w-2/3 rounded-lg" />
              <div className="bg-sage-muted/20 mt-3 h-4 w-1/2 rounded-lg" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
