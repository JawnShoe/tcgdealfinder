import Link from "next/link";
import { redirect } from "next/navigation";

import { searchCards } from "../../lib/cards";

type SearchParams = Record<string, string | string[] | undefined>;

function normalizeQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return value?.trim() ?? "";
}

function SearchForm({ initialQuery }: { initialQuery: string }) {
  return (
    <form
      method="GET"
      action="/search"
      className="flex w-full flex-col gap-3 rounded border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
    >
      <input
        type="text"
        name="q"
        defaultValue={initialQuery}
        placeholder="Search cards by name, set, or number…"
        className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Search
      </button>
    </form>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const query = normalizeQuery(searchParams?.q);

  if (!query) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Search cards</h1>
        <SearchForm initialQuery="" />
        <p className="text-sm text-slate-500">
          Type a card name, set, or collector number to find matching entries.
        </p>
      </main>
    );
  }

  const results = await searchCards(query);

  if (results.length === 1) {
    redirect(`/cards/${results[0].id}`);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Search cards</h1>
        <SearchForm initialQuery={query} />
      </div>
      {results.length === 0 ? (
        <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
          No cards found for <span className="font-semibold">&ldquo;{query}&rdquo;</span>. Try a
          different name, set, or collector number.
        </p>
      ) : (
        <div className="rounded border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-2 text-sm text-slate-500">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </div>
          <ul className="divide-y divide-slate-100">
            {results.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/cards/${card.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{card.name}</p>
                    <p className="text-sm text-slate-500">
                      {card.setName}
                      {card.cardNumber ? ` • #${card.cardNumber}` : ""}
                      {card.condition ? ` • ${card.condition}` : ""}
                    </p>
                  </div>
                  <span className="text-sm text-slate-400">View card →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
