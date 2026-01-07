export default function HomeContentSafe() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
              Real-time arbitrage radar
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Find undervalued Pok�mon cards in seconds.
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl">
              TCG Deal Finder scores every live eBay listing by discount, seller
              trust, and data confidence so you only spend time on the safest
              opportunities.
            </p>
          </div>

          <div className="text-sm text-slate-600">
            {/* simple placeholder stats for now */}
            <div>200+ live deals tracked</div>
            <div>40+ trusted sellers</div>
            <div>Fresh listings every day</div>
          </div>
        </div>
      </section>

      {/* All live deals placeholder � we�ll plug the real table back in later */}
      <section>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 px-4 py-4 md:px-6 md:py-5">
          <h2 className="text-lg font-semibold tracking-tight mb-1">
            All live deals
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Filters and the live deals table will be reattached here; this block
            is just a placeholder so the page compiles.
          </p>
        </div>
      </section>
    </div>
  );
}
