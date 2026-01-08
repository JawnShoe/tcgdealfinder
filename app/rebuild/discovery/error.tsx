"use client";

type RebuildDiscoveryErrorProps = {
  error: Error;
  reset: () => void;
};

export default function RebuildDiscoveryError({
  reset,
}: RebuildDiscoveryErrorProps) {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Rebuild lane
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-700">
            We could not load the discovery data. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}
