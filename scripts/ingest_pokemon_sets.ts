import "dotenv/config";

import { query } from "../lib/db";

const API_BASE = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250;
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1500;

type PokemonTCGSet = {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total: number;
  ptcgoCode?: string;
  releaseDate?: string;
  updatedAt?: string;
  images?: {
    symbol?: string;
    logo?: string;
  };
};

type ApiResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

async function fetchJson<T>(url: string, attempt = 0): Promise<ApiResponse<T>> {
  const apiKey = process.env.POKEMONTCG_IO_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (response.status === 429 || response.status >= 500) {
      if (attempt >= MAX_RETRIES) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body.substring(0, 200)}`);
      }
      const backoff = RETRY_DELAY_MS * Math.pow(2, attempt);
      console.warn(`Rate/server error (${response.status}). Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchJson<T>(url, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API error ${response.status}: ${body.substring(0, 200)}`);
    }

    return (await response.json()) as ApiResponse<T>;
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error;
    }
    const backoff = RETRY_DELAY_MS * Math.pow(2, attempt);
    console.warn(`Network error (${(error as Error).name}). Retrying in ${backoff}ms...`);
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return fetchJson<T>(url, attempt + 1);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllSets(): Promise<PokemonTCGSet[]> {
  const sets: PokemonTCGSet[] = [];
  let page = 1;
  let totalCount = Infinity;

  while (sets.length < totalCount) {
    const response = await fetchJson<PokemonTCGSet>(
      `${API_BASE}/sets?page=${page}&pageSize=${PAGE_SIZE}&orderBy=releaseDate`
    );
    sets.push(...response.data);
    totalCount = response.totalCount;
    console.log(
      `Fetched page ${response.page} (${response.data.length} sets, ${sets.length}/${totalCount} total)`
    );
    if (response.page * response.pageSize >= response.totalCount) {
      break;
    }
    page += 1;
  }

  return sets;
}

function normalizeReleaseDate(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const isoFriendly = value.replace(/\//g, "-");
  const parsed = new Date(`${isoFriendly}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

async function upsertSet(set: PokemonTCGSet): Promise<"inserted" | "updated"> {
  const releaseDate = normalizeReleaseDate(set.releaseDate);
  const result = await query<{ inserted: boolean }>(
    `
      INSERT INTO catalog_sets (
        pokemontcg_io_set_id,
        name,
        code,
        release_date,
        category,
        pokemontcg_series,
        pokemontcg_total_cards,
        symbol_url,
        logo_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'pokemon', $5, $6, $7, $8, NOW())
      ON CONFLICT (pokemontcg_io_set_id) DO UPDATE
        SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          release_date = EXCLUDED.release_date,
          pokemontcg_series = EXCLUDED.pokemontcg_series,
          pokemontcg_total_cards = EXCLUDED.pokemontcg_total_cards,
          symbol_url = EXCLUDED.symbol_url,
          logo_url = EXCLUDED.logo_url,
          updated_at = NOW()
      RETURNING (xmax = 0) AS inserted;
    `,
    [
      set.id,
      set.name.trim(),
      set.ptcgoCode ?? null,
      releaseDate,
      set.series ?? null,
      set.total ?? null,
      set.images?.symbol ?? null,
      set.images?.logo ?? null,
    ],
  );

  return result.rows[0].inserted ? "inserted" : "updated";
}

async function logSampleSets(sampleIds: string[]): Promise<void> {
  console.log("\nSample set verification:");
  for (const id of sampleIds) {
    const res = await query<{
      name: string;
      release_date: string | null;
      pokemontcg_series: string | null;
      pokemontcg_total_cards: number | null;
    }>(
      `
        SELECT name, release_date, pokemontcg_series, pokemontcg_total_cards
        FROM catalog_sets
        WHERE pokemontcg_io_set_id = $1
        LIMIT 1
      `,
      [id],
    );
    if (res.rows.length === 0) {
      console.log(`  - ${id}: NOT FOUND`);
      continue;
    }
    const row = res.rows[0];
    console.log(
      `  - ${row.name} (${id}) · series=${row.pokemontcg_series ?? "-"} · release=${row.release_date ?? "-"} · cards=${
        row.pokemontcg_total_cards ?? "-"
      }`,
    );
  }
}

async function ingestPokemonSets(): Promise<void> {
  console.log("=== Pokémon TCG set ingestion ===\n");
  const before = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM catalog_sets`);
  console.log(`Sets before import: ${before.rows[0].count}`);

  const sets = await fetchAllSets();
  console.log(`\nFetched ${sets.length} sets from Pokémon TCG API`);

  let inserted = 0;
  let updated = 0;

  for (const set of sets) {
    const op = await upsertSet(set);
    if (op === "inserted") inserted += 1;
    else updated += 1;
  }

  const after = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM catalog_sets`);

  console.log("\n=== Ingestion summary ===");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Total sets in DB: ${after.rows[0].count}`);

  await logSampleSets(["base1", "gym1", "ex6", "bw1", "sm1", "swsh11", "sv4"]);
}

ingestPokemonSets()
  .then(() => {
    console.log("\nSet ingestion complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nSet ingestion failed:", error);
    process.exit(1);
  });
