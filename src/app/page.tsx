export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ── */}
      <header className="border-sage-muted/40 border-b bg-white/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            {/* Leaf mark */}
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
          </div>

          <nav aria-label="Primary">
            <span className="text-sage-text/50 text-sm">South Carolina</span>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 items-center justify-center px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sage-accent mb-3 text-sm font-medium tracking-widest uppercase">
              Free &amp; Low-Cost Healthcare
            </p>

            <h1 className="font-display text-sage-text text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
              Find care near you
              <span className="text-sage-primary">.</span>
            </h1>

            <p className="text-sage-text/70 mx-auto mt-5 max-w-lg text-lg leading-relaxed">
              Search community health centers, free clinics, and charitable care
              across South Carolina — all in one place.
            </p>

            {/* Search placeholder — wired up in a later step */}
            <div className="mx-auto mt-10 max-w-md">
              <div className="border-sage-muted focus-within:ring-sage-primary/20 flex items-center gap-2 rounded-2xl border bg-white px-5 py-3.5 shadow-sm transition-shadow focus-within:shadow-md focus-within:ring-2">
                <svg
                  className="text-sage-muted h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="City, zip code, or clinic name…"
                  className="text-sage-text placeholder:text-sage-muted w-full bg-transparent focus:outline-none"
                  disabled
                  aria-label="Search clinics (coming soon)"
                />
              </div>
              <p className="text-sage-text/40 mt-2 text-xs">
                Search will be enabled in the next step.
              </p>
            </div>
          </div>
        </section>

        {/* ── Stats ribbon ── */}
        <section className="border-sage-muted/40 border-t bg-white/40">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 px-6 py-10 sm:grid-cols-3">
            {[
              { value: '—', label: 'Clinics listed' },
              { value: '46', label: 'SC counties served' },
              { value: 'Free', label: 'Always free to use' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-display text-sage-primary text-3xl font-bold">
                  {stat.value}
                </p>
                <p className="text-sage-text/60 mt-1 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-sage-muted/40 border-t px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sage-text/40 text-xs">
            &copy; {new Date().getFullYear()} FreeCare Locator. Not a substitute
            for professional medical advice.
          </p>
          <p className="text-sage-text/40 text-xs">
            Data sourced from HRSA, SC DHEC &amp; NAFC.
          </p>
        </div>
      </footer>
    </div>
  );
}
