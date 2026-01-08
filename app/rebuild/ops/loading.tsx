export default function RebuildOpsLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-10 rounded-lg bg-slate-100" />
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="h-6 w-40 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-64 rounded bg-slate-100" />
        </div>
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="h-5 w-32 rounded bg-slate-100" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="h-16 rounded bg-slate-100" />
              <div className="h-16 rounded bg-slate-100" />
              <div className="h-16 rounded bg-slate-100" />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="h-5 w-28 rounded bg-slate-100" />
            <div className="mt-3 h-24 rounded bg-slate-100" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="h-5 w-32 rounded bg-slate-100" />
            <div className="mt-3 h-16 rounded bg-slate-100" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="h-5 w-40 rounded bg-slate-100" />
            <div className="mt-3 h-10 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
