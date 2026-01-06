export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Rebuild lane — loading placeholder
        </div>

        <header className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-7 w-64 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-40 rounded bg-slate-200" />
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-3 w-16 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-20 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-28 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-24 rounded bg-slate-200" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-3 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-32 rounded bg-slate-200" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="mt-3 space-y-3">
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="h-5 w-56 rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
            <div className="h-4 w-4/6 rounded bg-slate-200" />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="h-14 rounded bg-slate-200" />
            <div className="h-14 rounded bg-slate-200" />
            <div className="h-14 rounded bg-slate-200" />
            <div className="h-14 rounded bg-slate-200" />
          </div>
        </section>
      </div>
    </main>
  );
}
